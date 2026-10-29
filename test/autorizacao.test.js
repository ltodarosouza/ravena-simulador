const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { abrir } = require("../lib/banco");
const { simular } = require("../lib/calculo");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");

const CARLOS = { papel: "vendedor", nome: "carlos" }; // Sorocaba e Votorantim
const RENATA = { papel: "vendedor", nome: "renata" }; // Itu e Salto
const DONO = { papel: "dono" };
const NINGUEM = null;
const ID_QUE_NUNCA_EXISTIU = "00000000-0000-4000-8000-000000000000";

// C4 sem painel: a regra mora na consulta do banco. Um pedido por cidade, e cada papel pergunta por todos.
async function comPedidos(fn) {
  const banco = await abrir();
  try {
    const ids = {};
    const zaps = { Sorocaba: "15998760001", Votorantim: "15998760002", Itu: "15998760003", Salto: "15998760004" };
    for (const [cidade, whatsapp] of Object.entries(zaps)) {
      const sim = simular({ conta: 600, cidade }, numeros, HOJE);
      const simulacao_id = await banco.guardarSimulacao(sim);
      const r = await banco.criarPedido({ simulacao_id, nome: `Pessoa de ${cidade}`, whatsapp });
      assert.ok(r.id, `controle: o pedido de ${cidade} foi criado`);
      ids[cidade] = r.id;
    }
    await fn({ banco, ids });
  } finally { await banco.fechar(); }
}

test("C4: o Carlos vê Sorocaba e Votorantim, e não vê Itu nem Salto", async () => {
  await comPedidos(async ({ banco, ids }) => {
    assert.equal((await banco.pedidoPara(CARLOS, ids.Sorocaba)).cidade, "Sorocaba");
    assert.equal((await banco.pedidoPara(CARLOS, ids.Votorantim)).cidade, "Votorantim");
    assert.equal(await banco.pedidoPara(CARLOS, ids.Itu), null);
    assert.equal(await banco.pedidoPara(CARLOS, ids.Salto), null);
  });
});

test("C4: a Renata vê Itu e Salto, e não vê Sorocaba nem Votorantim", async () => {
  await comPedidos(async ({ banco, ids }) => {
    assert.equal((await banco.pedidoPara(RENATA, ids.Itu)).cidade, "Itu");
    assert.equal((await banco.pedidoPara(RENATA, ids.Salto)).cidade, "Salto");
    assert.equal(await banco.pedidoPara(RENATA, ids.Sorocaba), null);
    assert.equal(await banco.pedidoPara(RENATA, ids.Votorantim), null);
  });
});

test("C4: o dono vê os quatro", async () => {
  await comPedidos(async ({ banco, ids }) => {
    for (const [cidade, id] of Object.entries(ids)) assert.equal((await banco.pedidoPara(DONO, id)).cidade, cidade);
  });
});

test("C4: quem não entrou não vê nada, e vendedor desconhecido também não", async () => {
  await comPedidos(async ({ banco, ids }) => {
    for (const id of Object.values(ids)) {
      assert.equal(await banco.pedidoPara(NINGUEM, id), null);
      assert.equal(await banco.pedidoPara(undefined, id), null);
      assert.equal(await banco.pedidoPara({ papel: "vendedor", nome: "joao" }, id), null);
      assert.equal(await banco.pedidoPara({ papel: "vendedor", nome: "__proto__" }, id), null);
      assert.equal(await banco.pedidoPara({ papel: "dono-de-mentira" }, id), null);
    }
  });
});

// A resposta para "existe, mas não é seu" é a mesma de "nunca existiu": quem tenta não descobre qual dos dois é.
test("C4: o pedido de outra cidade responde igual a um pedido que nunca existiu", async () => {
  await comPedidos(async ({ banco, ids }) => {
    const deOutraCidade = await banco.pedidoPara(CARLOS, ids.Itu);
    const inexistente = await banco.pedidoPara(CARLOS, ID_QUE_NUNCA_EXISTIU);
    assert.deepEqual(deOutraCidade, inexistente);
    assert.equal(await banco.pedidoPara(CARLOS, "42"), null, "identificador que nem parece identificador");
  });
});
