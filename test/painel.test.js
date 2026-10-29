const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { abrir } = require("../lib/banco");
const { simular } = require("../lib/calculo");
const { criarServidor } = require("../server");

const numeros = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8"),
).numeros;
const HOJE = new Date("2026-10-29T12:00:00-03:00");
const TOKENS = { carlos: "token-falso-carlos", renata: "token-falso-renata", dono: "token-falso-dono" };

async function criarPedido(banco, cidade, whatsapp) {
  const simulacao_id = await banco.guardarSimulacao(simular({ conta: 600, cidade }, numeros, HOJE));
  const pedido = await banco.criarPedido({ simulacao_id, nome: `Pessoa de ${cidade}`, whatsapp });
  assert.ok(pedido.id);
  return pedido.id;
}

async function comPainel(fn) {
  const banco = await abrir();
  const ids = {
    Sorocaba: await criarPedido(banco, "Sorocaba", "15998760001"),
    Itu: await criarPedido(banco, "Itu", "15998760003"),
  };
  const servidor = criarServidor({ banco, numeros, hoje: () => HOJE, acessos: TOKENS });
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const chamar = async (rota, { method = "GET", token, corpo } = {}) => {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (corpo) headers["content-type"] = "application/json";
    const resposta = await fetch(base + rota, {
      method,
      headers,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const texto = await resposta.text();
    return {
      status: resposta.status,
      corpo: texto && resposta.headers.get("content-type")?.includes("json") ? JSON.parse(texto) : texto,
    };
  };
  try {
    await fn({ banco, ids, chamar });
  } finally {
    servidor.close();
    await banco.fechar();
  }
}

test("C7: a tela do painel prepara o uso no celular sem guardar segredo", () => {
  const caminho = path.join(__dirname, "..", "public", "painel.html");
  assert.ok(fs.existsSync(caminho), "a tela do painel ainda não existe");
  const pagina = fs.readFileSync(caminho, "utf8");
  assert.match(pagina, /width=device-width/);
  assert.match(pagina, /min-height:\s*44px/);
  assert.match(pagina, /overflow-wrap|word-break/);
  for (const rotulo of ["Tamanho", "Painéis", "Investimento", "Conta depois", "Economia anual", "Retorno"]) {
    assert.match(pagina, new RegExp(rotulo, "i"), `falta mostrar ${rotulo}`);
  }
  assert.doesNotMatch(pagina, new RegExp(Object.values(TOKENS).join("|")));
});

test("C4 e C7: Carlos vê e altera só a região dele, com histórico", async () => {
  await comPainel(async ({ banco, ids, chamar }) => {
    assert.equal((await chamar("/api/painel/pedidos")).status, 401);

    const lista = await chamar("/api/painel/pedidos", { token: TOKENS.carlos });
    assert.equal(lista.status, 200);
    assert.deepEqual(lista.corpo.map((pedido) => pedido.cidade), ["Sorocaba"]);

    const deItu = await chamar(`/api/painel/pedidos/${ids.Itu}`, { token: TOKENS.carlos });
    const inexistente = await chamar("/api/painel/pedidos/00000000-0000-4000-8000-000000000000", { token: TOKENS.carlos });
    assert.deepEqual(deItu, inexistente, "pedido alheio e inexistente dão a mesma resposta");

    const tentativaAlheia = await chamar(`/api/painel/pedidos/${ids.Itu}/estagio`, {
      method: "PATCH", token: TOKENS.carlos, corpo: { estagio: "respondi" },
    });
    assert.equal(tentativaAlheia.status, 404);
    assert.equal((await banco.pedido(ids.Itu)).estagio, "chegou");

    const invalido = await chamar(`/api/painel/pedidos/${ids.Sorocaba}/estagio`, {
      method: "PATCH", token: TOKENS.carlos, corpo: { estagio: "qualquer" },
    });
    assert.equal(invalido.status, 422);

    const alterado = await chamar(`/api/painel/pedidos/${ids.Sorocaba}/estagio`, {
      method: "PATCH", token: TOKENS.carlos, corpo: { estagio: "respondi" },
    });
    assert.equal(alterado.status, 200);

    const detalhe = await chamar(`/api/painel/pedidos/${ids.Sorocaba}`, { token: TOKENS.carlos });
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.corpo.pedido.estagio, "respondi");
    assert.equal(detalhe.corpo.historico[0].de, "chegou");
    assert.equal(detalhe.corpo.historico[0].para, "respondi");
    assert.equal(detalhe.corpo.historico[0].alterado_por, "carlos");
    assert.ok(detalhe.corpo.historico[0].alterado_em);

    assert.equal((await chamar(`/api/painel/pedidos/${ids.Sorocaba}`, { token: TOKENS.renata })).status, 404);
  });
});
