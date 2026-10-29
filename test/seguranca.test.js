const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numerosReferencia = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");
// O mesmo CPF de exemplo público de test/dado-pessoal.test.js, escrito em três tipos de algarismo.
const CPF_ASCII = "52998224725";
const CPF_LARGURA_TOTAL = "５２９９８２２４７２５";
const CPF_ARABE = "٥٢٩٩٨٢٢٤٧٢٥";

// `numeros` pode ser trocado no meio do teste, como o dono tirando um número do banco.
async function comServidor(fn) {
  const banco = await abrir();
  const estado = { numeros: numerosReferencia };
  const srv = criarServidor({ banco, numeros: () => estado.numeros, hoje: () => HOJE });
  await new Promise((ok) => srv.listen(0, ok));
  const base = `http://localhost:${srv.address().port}`;
  const bruto = async (rota, corpo, tipo = "application/json") => {
    const r = await fetch(base + rota, { method: "POST", headers: { "content-type": tipo }, body: corpo });
    let json = null;
    try { json = await r.json(); } catch {}
    return { status: r.status, corpo: json };
  };
  const post = (rota, obj) => {
    const entrada = rota === "/api/pedido" ? { aceite_privacidade: true, ...obj } : obj;
    return bruto(rota, JSON.stringify(entrada));
  };
  const saidas = [];
  const antes = { log: console.log, error: console.error };
  console.log = console.error = (...a) => saidas.push(a.join(" "));
  try { await fn({ banco, post, bruto, estado, saidas }); }
  finally { console.log = antes.log; console.error = antes.error; srv.close(); await banco.fechar(); }
}
const total = async (banco) => (await banco.db.query("select count(*)::int n from pedidos")).rows[0].n;
async function simular(post) {
  const s = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
  return s.corpo.simulacao_id;
}

// Achado 1: sem teto no corpo, um nome de 30 MB era gravado.
test("Segurança 1: corpo grande é recusado e nada é gravado", async () => {
  await comServidor(async ({ banco, post, bruto }) => {
    const id = await simular(post);
    const enorme = JSON.stringify({ simulacao_id: id, nome: "A".repeat(3 * 1024 * 1024), whatsapp: "15998765432" });
    const r = await bruto("/api/pedido", enorme, "text/plain");
    assert.equal(r.status, 413);
    assert.equal(await total(banco), 0);
  });
});

test("Segurança 1: nome de 101 caracteres é recusado, de 100 passa", async () => {
  await comServidor(async ({ banco, post }) => {
    const id = await simular(post);
    const longo = await post("/api/pedido", { simulacao_id: id, nome: "A".repeat(101), whatsapp: "15998765432" });
    assert.equal(longo.status, 422);
    assert.equal(longo.corpo.erro, "nome_longo");
    assert.equal(await total(banco), 0);
    const limite = await post("/api/pedido", { simulacao_id: id, nome: "A".repeat(100), whatsapp: "15998765432" });
    assert.equal(limite.status, 201);
  });
});

// Achado 2: a resposta não pode dizer que o número já pediu.
test("Segurança 2: pedido repetido tem a mesma resposta de um pedido novo", async () => {
  await comServidor(async ({ banco, post }) => {
    const id = await simular(post);
    const novo = await post("/api/pedido", { simulacao_id: id, nome: "Maria Souza", whatsapp: "15998765432" });
    const repetido = await post("/api/pedido", { simulacao_id: id, nome: "Outra Pessoa", whatsapp: "15998765432" });
    assert.equal(repetido.status, novo.status);
    assert.deepEqual(repetido.corpo, novo.corpo);
    assert.ok(!("duplicado" in repetido.corpo));
    assert.equal(await total(banco), 1, "o repetido não cria pedido novo");
  });
});

// Achado 3: a regra do C6 também vale para o pedido.
test("Segurança 3: sem número vigente o pedido não é gravado, mesmo de simulação antiga", async () => {
  await comServidor(async ({ banco, post, estado }) => {
    const id = await simular(post);
    estado.numeros = {};
    const sim = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
    assert.equal(sim.status, 503, "controle: o simulador já recusa sem número");
    const r = await post("/api/pedido", { simulacao_id: id, nome: "Maria Souza", whatsapp: "15998765432" });
    assert.equal(r.status, 503);
    assert.equal(r.corpo.erro, "sem_valor_vigente");
    assert.equal(await total(banco), 0);
  });
});

// Achado 4: o filtro de CPF não pode depender de como os algarismos são escritos.
for (const [rotulo, nome] of [
  ["largura total", `Joao ${CPF_LARGURA_TOTAL}`],
  ["algarismos árabes", `Joao ${CPF_ARABE}`],
  ["controle ASCII", `Joao ${CPF_ASCII}`],
]) {
  test(`Segurança 4: CPF no nome (${rotulo}) é recusado e não é gravado`, async () => {
    await comServidor(async ({ banco, post, saidas }) => {
      const id = await simular(post);
      const r = await post("/api/pedido", { simulacao_id: id, nome, whatsapp: "15998765432" });
      assert.equal(r.status, 422);
      assert.equal(r.corpo.erro, "nome_com_cpf");
      assert.equal(await total(banco), 0);
      assert.ok(!/[５٥]/.test(saidas.join("\n")), "o CPF não aparece em log");
    });
  });
}

test("Segurança 4: CPF em largura total no WhatsApp também é recusado", async () => {
  await comServidor(async ({ banco, post }) => {
    const id = await simular(post);
    const r = await post("/api/pedido", { simulacao_id: id, nome: "Maria Souza", whatsapp: CPF_LARGURA_TOTAL });
    assert.equal(r.status, 422);
    assert.equal(await total(banco), 0);
  });
});

// Achado 5: entrada malformada é erro do pedido, nunca erro interno.
for (const [rotulo, rota, corpo] of [
  ["null em /api/pedido", "/api/pedido", "null"],
  ["null em /api/simular", "/api/simular", "null"],
  ["lista em /api/pedido", "/api/pedido", "[]"],
  ["texto em /api/simular", "/api/simular", '"oi"'],
  ["número em /api/pedido", "/api/pedido", "42"],
]) {
  test(`Segurança 5: ${rotulo} dá 400, não 500`, async () => {
    await comServidor(async ({ bruto }) => {
      const r = await bruto(rota, corpo);
      assert.equal(r.status, 400);
      assert.equal(r.corpo.erro, "corpo_invalido");
    });
  });
}

for (const [rotulo, simulacao_id] of [["texto qualquer", "abc"], ["objeto", { a: 1 }], ["número", 7]]) {
  test(`Segurança 5: simulacao_id ${rotulo} dá "faça de novo", não 500`, async () => {
    await comServidor(async ({ post }) => {
      const r = await post("/api/pedido", { simulacao_id, nome: "Maria Souza", whatsapp: "15998765432" });
      assert.equal(r.status, 422);
      assert.equal(r.corpo.erro, "simulacao_inexistente");
    });
  });
}
