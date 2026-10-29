const fs = require("fs");
const path = require("path");
const { PGlite } = require("@electric-sql/pglite");
const { erroDoNome, whatsappParecidoCpf } = require("./dado-pessoal");
const { cidadesVisiveis } = require("./acesso");
const dataTexto = (valor) => valor instanceof Date
  ? valor.toISOString().slice(0, 10)
  : String(valor).slice(0, 10);

// whatsapp brasileiro com DDD: só dígitos, 10 ou 11, DDD de 11 a 99, celular de 11 dígitos começa com 9
function normalizarWhatsapp(texto) {
  let d = String(texto || "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (Number(d.slice(0, 2)) < 11) return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return d;
}

// O identificador da simulação vem de fora: só consulta o banco se tiver cara de identificador.
const ehUuid = (x) => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);

async function abrir(dir) {
  const db = dir ? new PGlite(dir) : new PGlite();
  await db.exec(fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8"));

  async function guardarSimulacao(sim) {
    const r = await db.query(
      "insert into simulacoes (conta, cidade, resultado, numeros) values ($1, $2, $3, $4) returning id",
      [sim.entrada.conta, sim.entrada.cidade, JSON.stringify(sim.exibido), JSON.stringify(sim.numeros_usados)]
    );
    return r.rows[0].id;
  }

  // O pedido copia da simulação o que a pessoa viu; nada é recalculado aqui.
  async function criarPedido({ simulacao_id, nome, whatsapp }) {
    const nomeLimpo = String(nome || "").trim();
    const erroNome = erroDoNome(nomeLimpo);
    if (erroNome) return { erro: erroNome };
    if (whatsappParecidoCpf(whatsapp)) return { erro: "whatsapp_parece_cpf" };
    const zap = normalizarWhatsapp(whatsapp);
    if (!zap) return { erro: "whatsapp_invalido" };
    if (!ehUuid(simulacao_id)) return { erro: "simulacao_inexistente" };
    const s = await db.query("select * from simulacoes where id = $1", [simulacao_id]);
    if (!s.rows.length) return { erro: "simulacao_inexistente" };
    if (s.rows[0].resultado && s.rows[0].resultado.nao_compensa) return { erro: "nao_compensa" }; // quem não compensa não deixa contato
    const recente = await db.query(
      "select id from pedidos where whatsapp = $1 and criado_em > now() - interval '24 hours' limit 1",
      [zap]
    );
    if (recente.rows.length) return { duplicado: true, id: recente.rows[0].id };
    const sim = s.rows[0];
    const r = await db.query(
      `insert into pedidos (simulacao_id, nome, whatsapp, cidade, conta, resultado, numeros)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [sim.id, nomeLimpo, zap, sim.cidade, sim.conta, JSON.stringify(sim.resultado), JSON.stringify(sim.numeros)]
    );
    return { id: r.rows[0].id };
  }

  const comoPedido = (p) => (p ? { id: p.id, nome: p.nome, whatsapp: p.whatsapp, cidade: p.cidade, conta: p.conta, resultado: p.resultado, numeros: p.numeros, estagio: p.estagio } : null);

  async function pedido(id) {
    return comoPedido((await db.query("select * from pedidos where id = $1", [id])).rows[0]);
  }

  // C4: a regra de quem vê está no WHERE. Quem não pode ver o pedido recebe null, igual a um pedido que não existe.
  async function pedidoPara(quem, id) {
    const cidades = cidadesVisiveis(quem);
    if (cidades !== null && cidades.length === 0) return null;
    if (!ehUuid(id)) return null;
    const r = cidades === null
      ? await db.query("select * from pedidos where id = $1", [id])
      : await db.query("select * from pedidos where id = $1 and cidade = any($2::text[])", [id, cidades]);
    return comoPedido(r.rows[0]);
  }

  async function listarPedidosPara(quem) {
    const cidades = cidadesVisiveis(quem);
    if (cidades !== null && cidades.length === 0) return [];
    const r = cidades === null
      ? await db.query("select * from pedidos order by criado_em desc")
      : await db.query("select * from pedidos where cidade = any($1::text[]) order by criado_em desc", [cidades]);
    return r.rows.map(comoPedido);
  }

  async function alterarEstagioPara(quem, id, para) {
    if (!ehUuid(id)) return null;
    const cidades = cidadesVisiveis(quem);
    if (cidades !== null && cidades.length === 0) return null;
    await db.exec("begin");
    try {
      const atual = cidades === null
        ? await db.query("select estagio from pedidos where id = $1 for update", [id])
        : await db.query("select estagio from pedidos where id = $1 and cidade = any($2::text[]) for update", [id, cidades]);
      if (!atual.rows.length) {
        await db.exec("rollback");
        return null;
      }
      const de = atual.rows[0].estagio;
      await db.query("update pedidos set estagio = $2 where id = $1", [id, para]);
      await db.query(
        `insert into historico_estagios (pedido_id, de, para, alterado_por)
         values ($1, $2, $3, $4)`,
        [id, de, para, quem.papel === "dono" ? "dono" : quem.nome],
      );
      await db.exec("commit");
      return pedidoPara(quem, id);
    } catch (erro) {
      await db.exec("rollback");
      throw erro;
    }
  }

  async function historicoEstagioPara(quem, id) {
    if (!await pedidoPara(quem, id)) return null;
    const r = await db.query(
      `select de, para, alterado_por, alterado_em
       from historico_estagios where pedido_id = $1 order by alterado_em desc`,
      [id],
    );
    return r.rows;
  }

  // auxiliares dos testes (a mesma interface existe em banco-supabase.js)
  async function contarPedidos(zap) {
    return (await db.query("select count(*)::int as n from pedidos where whatsapp = $1", [zap])).rows[0].n;
  }
  async function ultimoPedidoDe(zap) {
    const r = await db.query("select id from pedidos where whatsapp = $1 order by criado_em desc limit 1", [zap]);
    return r.rows.length ? pedido(r.rows[0].id) : null;
  }
  async function envelhecerPedidos(zap, horas) {
    await db.query("update pedidos set criado_em = now() - make_interval(hours => $2) where whatsapp = $1", [zap, horas]);
  }

  async function numerosVigentes(hoje = new Date()) {
    const dia = hoje.toISOString().slice(0, 10);
    const r = await db.query(
      "select chave, valor, vigencia, fonte from numeros_calculo where vigencia <= $1 order by vigencia",
      [dia],
    );
    const numeros = {};
    for (const linha of r.rows) {
      numeros[linha.chave] = {
        valor: linha.valor,
        vigencia: dataTexto(linha.vigencia),
        fonte: linha.fonte,
      };
    }
    return numeros;
  }

  async function salvarNumero({ chave, valor, vigencia, fonte, alterado_por }) {
    await db.exec("begin");
    try {
      await db.query(
        `insert into numeros_calculo (chave, valor, vigencia, fonte)
         values ($1, $2, $3, $4)
         on conflict (chave, vigencia) do update set valor = excluded.valor, fonte = excluded.fonte`,
        [chave, JSON.stringify(valor), vigencia, fonte],
      );
      await db.query(
        `insert into historico_numeros_calculo (chave, valor, vigencia, fonte, alterado_por)
         values ($1, $2, $3, $4, $5)`,
        [chave, JSON.stringify(valor), vigencia, fonte, alterado_por],
      );
      await db.exec("commit");
    } catch (erro) {
      await db.exec("rollback");
      throw erro;
    }
  }

  async function historicoNumero(chave) {
    const r = await db.query(
      `select valor, vigencia, fonte, alterado_por, alterado_em
       from historico_numeros_calculo where chave = $1 order by alterado_em desc`,
      [chave],
    );
    return r.rows.map((linha) => ({
      ...linha,
      vigencia: dataTexto(linha.vigencia),
    }));
  }

  async function limpar() {}

  return {
    db, guardarSimulacao, criarPedido, pedido, pedidoPara, contarPedidos, ultimoPedidoDe,
    listarPedidosPara, alterarEstagioPara, historicoEstagioPara, envelhecerPedidos,
    numerosVigentes, salvarNumero, historicoNumero, limpar, fechar: () => db.close(),
  };
}

module.exports = { abrir, normalizarWhatsapp, ehUuid };
