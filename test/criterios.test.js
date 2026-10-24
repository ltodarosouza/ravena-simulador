const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { simular } = require("../lib/calculo");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");

// C1. Conta de R$ 600 em Sorocaba com os números congelados.
test("C1: R$ 600 em Sorocaba mostra os seis resultados e o retorno não é menor que 3 anos", () => {
  const r = simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE);
  const e = r.exibido;
  assert.equal(typeof e.kwp, "number");
  assert.equal(e.kwp * 10, Math.round(e.kwp * 10), "kWp com 1 casa decimal");
  assert.ok(Number.isInteger(e.paineis));
  assert.equal(e.investimento % 100, 0, "investimento na centena");
  assert.ok(Number.isInteger(e.conta_depois) && Number.isInteger(e.economia_ano1));
  assert.ok(e.retorno, "tem retorno");
  assert.ok(e.retorno.total_meses >= 3 * 12, `retorno de ${e.retorno.anos} anos e ${e.retorno.meses} meses é menor que 3 anos`);
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

// C3. O pedido guarda o que a pessoa viu.
test("C3: o pedido tem o valor digitado, a cidade, os resultados como mostrados e os números usados", async () => {
  const banco = await abrir();
  const srv = criarServidor({ banco, numeros, hoje: () => HOJE });
  await new Promise((ok) => srv.listen(0, ok));
  const base = `http://localhost:${srv.address().port}`;
  const post = async (rota, corpo) => {
    const r = await fetch(base + rota, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    return { status: r.status, corpo: await r.json() };
  };
  try {
    const tela = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
    assert.equal(tela.status, 200);
    const { simulacao_id, ...visto } = tela.corpo;

    const enviado = await post("/api/pedido", { simulacao_id, nome: "Maria Souza", whatsapp: "(15) 99876-5432" });
    assert.equal(enviado.status, 201);

    const linha = await banco.pedido(enviado.corpo.id);
    assert.equal(Number(linha.conta), 600);
    assert.equal(linha.cidade, "Sorocaba");
    assert.equal(linha.whatsapp, "15998765432");
    assert.deepEqual(linha.resultado, visto, "resultados exatamente como mostrados");
    for (const [chave, n] of Object.entries(linha.numeros)) {
      assert.ok(n.valor !== undefined && n.vigencia && n.fonte, `${chave} com valor, data e fonte`);
    }
    assert.ok(linha.numeros.tarifa_kwh && linha.numeros.fio_b_percentual_por_ano);

    // mesmo WhatsApp em 24 h: não nasce pedido novo
    const outra = await post("/api/simular", { conta: 800, cidade: "Itu" });
    const repetido = await post("/api/pedido", { simulacao_id: outra.corpo.simulacao_id, nome: "Maria", whatsapp: "15998765432" });
    assert.equal(repetido.corpo.duplicado, true);
    assert.match(repetido.corpo.mensagem, /Já recebemos/);
    const total = await banco.db.query("select count(*)::int as n from pedidos");
    assert.equal(total.rows[0].n, 1);

    // depois de 24 h o mesmo WhatsApp vale de novo
    await banco.db.query("update pedidos set criado_em = now() - interval '25 hours'");
    const depois = await post("/api/pedido", { simulacao_id: outra.corpo.simulacao_id, nome: "Maria", whatsapp: "15998765432" });
    assert.equal(depois.status, 201);

    // nome vazio e WhatsApp inválido não criam pedido
    assert.equal((await post("/api/pedido", { simulacao_id, nome: " ", whatsapp: "15998765432" })).corpo.erro, "nome_vazio");
    assert.equal((await post("/api/pedido", { simulacao_id, nome: "Ana", whatsapp: "123" })).corpo.erro, "whatsapp_invalido");
  } finally {
    srv.close();
    await banco.fechar();
  }
});
