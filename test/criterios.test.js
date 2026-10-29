const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { simular } = require("../lib/calculo");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");
const supabase = require("../lib/banco-supabase");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");

// C1. Conta de R$ 600 em Sorocaba.
// A forma da resposta se confere com os números de teste (referencia/numeros.json). O piso de 3 anos,
// não: ele só quer dizer algo com os números do dono, com data e fonte. Com números de teste, o
// resultado não prova nada sobre a promessa do brief.
test("C1: R$ 600 em Sorocaba mostra os seis resultados, na forma pedida", () => {
  const r = simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE);
  const e = r.exibido;
  assert.equal(typeof e.kwp, "number");
  assert.equal(e.kwp * 10, Math.round(e.kwp * 10), "kWp com 1 casa decimal");
  assert.ok(Number.isInteger(e.paineis));
  assert.equal(e.investimento % 100, 0, "investimento na centena");
  assert.ok(Number.isInteger(e.conta_depois) && Number.isInteger(e.economia_ano1));
  assert.ok(e.retorno && Number.isInteger(e.retorno.anos) && Number.isInteger(e.retorno.meses));
});

test("C1: com os números do dono, o retorno de R$ 600 em Sorocaba não é menor que 3 anos", async (t) => {
  if (process.env.TESTAR_NO_SUPABASE !== "1" || !supabase.configurado()) return t.todo("pendente: rode com TESTAR_NO_SUPABASE=1 e com os números do dono no banco (seção 11 da spec)");
  const banco = supabase.abrir();
  const doDono = await banco.numerosVigentes(new Date());
  const faltam = Object.keys(numeros).filter((k) => !doDono[k]);
  if (faltam.length) return t.todo(`pendente: o dono ainda não cadastrou ${faltam.join(", ")}`);
  const r = simular({ conta: 600, cidade: "Sorocaba" }, doDono, new Date());
  assert.ok(r.exibido.retorno.total_meses >= 36, `retorno de ${r.exibido.retorno.anos} anos e ${r.exibido.retorno.meses} meses é menor que 3 anos`);
});

test("C1: os cálculos internos não são arredondados e o painel recebe o que a tela mostrou", () => {
  const r = simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE);
  assert.notEqual(r.interno.kwp, r.exibido.kwp, "o interno guarda o valor sem arredondar");
  assert.equal(r.exibido.investimento, Math.round(r.interno.investimento / 100) * 100);
});

test("sem valor vigente o simulador não responde", () => {
  const sem = { ...numeros, tarifa_kwh: { ...numeros.tarifa_kwh, vigencia: "2099-01-01" } };
  assert.throws(() => simular({ conta: 600, cidade: "Sorocaba" }, sem, HOJE), /sem valor vigente/);
});

// C6. Sem número vigente o simulador não responde e avisa, em vez de usar valor velho ou de teste.
test("C6: sem os números do dono, /api/simular recusa com aviso e não calcula", async () => {
  const banco = await abrir();
  try {
    for (const [rotulo, nums] of [["nenhum número", {}], ["falta a tarifa", (() => { const { tarifa_kwh, ...resto } = numeros; return resto; })()], ["tarifa ainda não vigente", { ...numeros, tarifa_kwh: { ...numeros.tarifa_kwh, vigencia: "2099-01-01" } }]]) {
      const srv = criarServidor({ banco, numeros: async () => nums, hoje: () => HOJE });
      await new Promise((ok) => srv.listen(0, ok));
      const r = await fetch(`http://localhost:${srv.address().port}/api/simular`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta: 600, cidade: "Sorocaba" }) });
      const corpo = await r.json();
      srv.close();
      assert.equal(r.status, 503, rotulo);
      assert.equal(corpo.erro, "sem_valor_vigente", rotulo);
      assert.equal(corpo.kwp, undefined, `${rotulo}: não devolve conta`);
    }
    for (const tabela of ["simulacoes", "pedidos"]) assert.equal((await banco.db.query(`select count(*)::int n from ${tabela}`)).rows[0].n, 0, `nada foi gravado em ${tabela}`);
  } finally { await banco.fechar(); }
});

// C3. O pedido guarda o que a pessoa viu. Roda no banco de teste (PGlite) e, se pedido, no Supabase de verdade.
const bancos = [["PGlite", () => abrir()]];
// no banco de verdade só quando alguém pede (TESTAR_NO_SUPABASE=1): os testes criam e apagam linhas no banco da landing
if (process.env.TESTAR_NO_SUPABASE === "1" && supabase.configurado()) bancos.push(["Supabase", async () => supabase.abrir()]);

for (const [nomeBanco, abrirBanco] of bancos) {
  test(`C3 (${nomeBanco}): o pedido tem o valor digitado, a cidade, os resultados como mostrados e os números usados`, async () => {
    const banco = await abrirBanco();
    const srv = criarServidor({ banco, numeros, hoje: () => HOJE });
    await new Promise((ok) => srv.listen(0, ok));
    const base = `http://localhost:${srv.address().port}`;
    const post = async (rota, corpo) => {
      const entrada = rota === "/api/pedido" ? { aceite_privacidade: true, ...corpo } : corpo;
      const r = await fetch(base + rota, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entrada) });
      return { status: r.status, corpo: await r.json() };
    };
    // WhatsApp inventado para não esbarrar em dado real; os testes apagam o que criaram
    const zap = "11900000" + String(Math.floor(Math.random() * 900) + 100);
    const calculos = [];
    try {
      const tela = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
      assert.equal(tela.status, 200);
      const { simulacao_id, ...visto } = tela.corpo;
      calculos.push(simulacao_id);

      const enviado = await post("/api/pedido", { simulacao_id, nome: "Maria Teste", whatsapp: zap });
      assert.equal(enviado.status, 201);

      const linha = await banco.ultimoPedidoDe(zap);
      assert.equal(Number(linha.conta), 600);
      assert.equal(linha.cidade, "Sorocaba");
      assert.equal(linha.whatsapp, zap);
      assert.deepEqual(linha.resultado, visto, "resultados exatamente como mostrados");
      for (const [chave, n] of Object.entries(linha.numeros)) {
        assert.ok(n.valor !== undefined && n.vigencia && n.fonte, `${chave} com valor, data e fonte`);
      }
      assert.ok(linha.numeros.tarifa_kwh && linha.numeros.fio_b_percentual_por_ano);

      // mesmo WhatsApp em 24 h: não nasce pedido novo
      const outra = await post("/api/simular", { conta: 800, cidade: "Itu" });
      calculos.push(outra.corpo.simulacao_id);
      const repetido = await post("/api/pedido", { simulacao_id: outra.corpo.simulacao_id, nome: "Maria Teste", whatsapp: zap });
      assert.equal(repetido.status, enviado.status, "a resposta não revela que o número já pediu");
      assert.deepEqual(repetido.corpo, enviado.corpo, "corpo idêntico ao de um pedido novo");
      assert.equal(await banco.contarPedidos(zap), 1);

      // depois de 24 h o mesmo WhatsApp vale de novo
      await banco.envelhecerPedidos(zap, 25);
      const depois = await post("/api/pedido", { simulacao_id: outra.corpo.simulacao_id, nome: "Maria Teste", whatsapp: zap });
      assert.equal(depois.status, 201);
      assert.equal(await banco.contarPedidos(zap), 2);

      // nome vazio e WhatsApp inválido não criam pedido
      assert.equal((await post("/api/pedido", { simulacao_id, nome: " ", whatsapp: zap })).corpo.erro, "nome_vazio");
      assert.equal((await post("/api/pedido", { simulacao_id, nome: "Ana Teste", whatsapp: "123" })).corpo.erro, "whatsapp_invalido");
    } finally {
      srv.close();
      await banco.limpar(zap, calculos);
      await banco.fechar();
    }
  });
}
