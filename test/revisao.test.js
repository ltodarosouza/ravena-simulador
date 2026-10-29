// Testes que a revisão adversarial apontou como faltando (itens 4, 7, 1 e 8 da lista em revisao/lista-bruta.md).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { simular } = require("../lib/calculo");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");

async function comServidor(nums, fn) {
  const banco = await abrir();
  const srv = criarServidor({ banco, numeros: nums, hoje: () => HOJE });
  await new Promise((ok) => srv.listen(0, ok));
  const base = `http://localhost:${srv.address().port}`;
  const post = async (rota, corpo) => {
    const entrada = rota === "/api/pedido" ? { aceite_privacidade: true, ...corpo } : corpo;
    const r = await fetch(base + rota, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entrada) });
    return { status: r.status, corpo: await r.json() };
  };
  try { await fn({ banco, post }); } finally { srv.close(); await banco.fechar(); }
}

// ---- Item 7: a faixa, a cidade e os valores da conta (regra de dinheiro) ----

test("a faixa de R$ 100 a R$ 2.000: fora dela não calcula, nas pontas calcula", () => {
  for (const conta of [99.99, 2000.01, 50, 5000]) assert.equal(simular({ conta, cidade: "Sorocaba" }, numeros, HOJE).erro, "fora_da_faixa", `R$ ${conta}`);
  for (const conta of [100, 2000]) assert.ok(simular({ conta, cidade: "Sorocaba" }, numeros, HOJE).exibido, `R$ ${conta}`);
});

test("cidade fora da lista, vazia ou ausente não calcula", () => {
  for (const cidade of ["Campinas", "", undefined, null, "sorocaba"]) assert.equal(simular({ conta: 600, cidade }, numeros, HOJE).erro, "cidade_invalida", String(cidade));
  for (const cidade of ["Sorocaba", "Votorantim", "Itu", "Salto"]) assert.ok(simular({ conta: 600, cidade }, numeros, HOJE).exibido, cidade);
});

// Valores de referência feitos à mão (não saem do código), com os números de teste de referencia/numeros.json, em 2026:
//   consumo = (600 - 25) / 0,95 = 605,26 kWh; kWp = 605,26 / 115 = 5,263; painéis = teto(5,263 / 0,55 = 9,57) = 10
//   faixa até 8 kWp: R$ 2.547 x 5,263 = R$ 13.405 -> 13.400; compensada = 605,26 - 50 = 555,26 kWh
//   Fio B 2026 (60%): 0,60 x 0,30 x 555,26 = 99,95; conta depois = 50 x 0,95 + 25 + 99,95 = 172,45 -> 172
//   economia ano 1 = (600 - 172,45) x 12 = 5.130,6 -> 5.131; ano 2 (75%): 4.831; ano 3 (90%): 4.531
//   retorno: 5.130,6 + 4.831 = 9.961,6; faltam 3.443,7 de 4.531 no ano 3 = 9,1 meses -> 2 anos e 9,1 meses -> 34 meses
test("R$ 600 em Sorocaba dá os números feitos à mão", () => {
  const e = simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE).exibido;
  assert.equal(e.kwp, 5.3);
  assert.equal(e.paineis, 10);
  assert.equal(e.investimento, 13400);
  assert.equal(e.conta_depois, 172);
  assert.equal(e.economia_ano1, 5131);
  assert.deepEqual(e.retorno, { anos: 2, meses: 10, total_meses: 34 });
  assert.equal(e.nao_compensa, false);
});

test("o ano muda o Fio B e, com ele, o retorno (a conta é projetada ano a ano)", () => {
  const em2026 = simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE).exibido;
  const em2029 = simular({ conta: 600, cidade: "Sorocaba" }, numeros, new Date("2029-06-01T12:00:00-03:00")).exibido;
  assert.ok(em2029.economia_ano1 < em2026.economia_ano1, "com o Fio B a 100% a economia do primeiro ano é menor");
  assert.ok(em2029.retorno.total_meses > em2026.retorno.total_meses, "e o retorno é mais longo");
});

test("R$ 100 passa do limite de retorno e é marcado como não compensa", () => {
  const e = simular({ conta: 100, cidade: "Sorocaba" }, numeros, HOJE).exibido;
  assert.equal(e.nao_compensa, true);
  assert.ok(e.retorno.total_meses > 6 * 12);
});

// ---- Item 4 (a parte que o código alcança): número zerado, negativo ou implausível não vira conta com null ----

for (const [rotulo, chave, valor] of [
  ["tarifa zero", "tarifa_kwh", 0],
  ["tarifa negativa", "tarifa_kwh", -0.95],
  ["geração por kWp zero", "geracao_kwh_por_kwp_mes", 0],
  ["potência do painel zero", "potencia_painel_kwp", 0],
  ["Fio B acima de 100%", "fio_b_percentual_por_ano", { 2026: 1.5, 2027: 1.5 }],
  ["tarifa que não é número", "tarifa_kwh", "abc"],
]) {
  test(`número cadastrado errado (${rotulo}): o simulador não responde e não grava conta`, async () => {
    const ruins = { ...numeros, [chave]: { ...numeros[chave], valor } };
    await comServidor(ruins, async ({ banco, post }) => {
      const r = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
      assert.equal(r.status, 503, "tem de recusar com o aviso de atualização");
      assert.equal(r.corpo.erro, "sem_valor_vigente");
      assert.equal(r.corpo.kwp, undefined, "não devolve conta");
      assert.equal((await banco.db.query("select count(*)::int n from simulacoes")).rows[0].n, 0, "nada gravado");
    });
  });
}

// ---- Item 1: quem tem conta que não compensa não deixa dado, nem pelo servidor ----

test("simulação que não compensa: o servidor recusa o pedido e não grava a pessoa", async () => {
  await comServidor(numeros, async ({ banco, post }) => {
    const sim = await post("/api/simular", { conta: 100, cidade: "Sorocaba" });
    assert.equal(sim.status, 200);
    assert.equal(sim.corpo.nao_compensa, true);
    const r = await post("/api/pedido", { simulacao_id: sim.corpo.simulacao_id, nome: "Maria Souza", whatsapp: "15998765432" });
    assert.equal(r.status, 422, "o pedido tem de ser recusado");
    assert.equal(r.corpo.erro, "nao_compensa");
    assert.match(r.corpo.mensagem, /não compensa/i);
    assert.equal(await banco.contarPedidos("15998765432"), 0, "nenhum pedido gravado");
  });
});

test("simulação que compensa continua podendo virar pedido", async () => {
  await comServidor(numeros, async ({ post }) => {
    const sim = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
    const r = await post("/api/pedido", { simulacao_id: sim.corpo.simulacao_id, nome: "Maria Souza", whatsapp: "15998765432" });
    assert.equal(r.status, 201);
  });
});

// ---- Itens 1 e 8: o que a página faz (conferido no código da página; o navegador é conferido à parte, em evidencia/) ----

const pagina = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

test("a página trata nao_compensa: mostra a mensagem e esconde o formulário de pedido", () => {
  assert.match(pagina, /nao_compensa/, "a página tem de olhar o campo nao_compensa");
  assert.match(pagina, /\$\("pedir"\)\.hidden\s*=\s*corpo\.nao_compensa|pedir[^;]*hidden[^;]*nao_compensa/s, "o formulário de pedido some quando não compensa");
});

test("o campo da conta aceita texto (R$ 1.234,56), não só número", () => {
  const campo = pagina.match(/<input[^>]*id="conta"[^>]*>/)[0];
  assert.doesNotMatch(campo, /type="number"/, "type=number faz o navegador descartar 1.234,56 antes de enviar");
  assert.match(campo, /inputmode="decimal"/, "mantém o teclado numérico no celular");
});
