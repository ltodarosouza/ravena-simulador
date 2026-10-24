const fs = require("fs");
const path = require("path");
const { PGlite } = require("@electric-sql/pglite");
const { erroDoNome } = require("./dado-pessoal");

// whatsapp brasileiro com DDD: só dígitos, 10 ou 11, DDD de 11 a 99, celular de 11 dígitos começa com 9
function normalizarWhatsapp(texto) {
  let d = String(texto || "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (Number(d.slice(0, 2)) < 11) return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return d;
}

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
    const zap = normalizarWhatsapp(whatsapp);
    if (!zap) return { erro: "whatsapp_invalido" };
    const s = await db.query("select * from simulacoes where id = $1", [simulacao_id]);
    if (!s.rows.length) return { erro: "simulacao_inexistente" };
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

  async function pedido(id) {
    const r = await db.query("select * from pedidos where id = $1", [id]);
    const p = r.rows[0];
    return p ? { id: p.id, nome: p.nome, whatsapp: p.whatsapp, cidade: p.cidade, conta: p.conta, resultado: p.resultado, numeros: p.numeros, estagio: p.estagio } : null;
  }

  // auxiliares dos testes (a mesma interface existe em banco-supabase.js)
  async function contarPedidos(zap) {
    return (await db.query("select count(*)::int as n from pedidos where whatsapp = $1", [zap])).rows[0].n;
  }
  async function envelhecerPedidos(zap, horas) {
    await db.query("update pedidos set criado_em = now() - make_interval(hours => $2) where whatsapp = $1", [zap, horas]);
  }
  async function limpar() {}

  return { db, guardarSimulacao, criarPedido, pedido, contarPedidos, envelhecerPedidos, limpar, fechar: () => db.close() };
}

module.exports = { abrir, normalizarWhatsapp };
