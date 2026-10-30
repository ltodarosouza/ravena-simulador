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
const HOJE = new Date("2026-10-30T12:00:00-03:00");
const TOKEN_DONO = "token-falso-do-dono-para-exclusao";

async function novoPedido(banco, { nome, whatsapp }) {
  const simulacaoId = await banco.guardarSimulacao(
    simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE),
  );
  const pedido = await banco.criarPedido({ simulacao_id: simulacaoId, nome, whatsapp });
  assert.ok(pedido.id);
  return { pedidoId: pedido.id, simulacaoId };
}

async function existe(banco, tabela, id) {
  const resposta = await banco.db.query(`select id from ${tabela} where id = $1`, [id]);
  return resposta.rows.length > 0;
}

async function comServidor(fn) {
  const banco = await abrir();
  const servidor = criarServidor({
    banco,
    numeros,
    hoje: () => HOJE,
    donoToken: TOKEN_DONO,
  });
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const excluir = async ({ token, whatsapp, confirmacao }) => {
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const resposta = await fetch(base + "/api/dono/exclusao", {
      method: "POST",
      headers,
      body: JSON.stringify({ whatsapp, confirmacao }),
    });
    return { status: resposta.status, corpo: await resposta.json() };
  };
  try {
    await fn({ banco, excluir });
  } finally {
    servidor.close();
    await banco.fechar();
  }
}

test("a tela do dono permite confirmar a exclusão sem guardar segredo", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "..", "public", "dono.html"), "utf8");
  assert.ok(/id=["']exclusao["']/.test(pagina), "falta o formulário de exclusão");
  assert.ok(/id=["']whatsapp-exclusao["']/.test(pagina), "falta o WhatsApp da exclusão");
  assert.ok(/id=["']confirmacao-exclusao["']/.test(pagina), "falta a confirmação da exclusão");
  assert.ok(/EXCLUIR/.test(pagina), "falta explicar a confirmação EXCLUIR");
  assert.doesNotMatch(pagina, new RegExp(TOKEN_DONO), "o segredo não pode estar na página");
});

test("só o dono exclui todos os dados ligados ao WhatsApp confirmado", async () => {
  await comServidor(async ({ banco, excluir }) => {
    const alvo1 = await novoPedido(banco, { nome: "Pessoa Fictícia", whatsapp: "15998763001" });
    await banco.envelhecerPedidos("15998763001", 25);
    const alvo2 = await novoPedido(banco, { nome: "Pessoa Fictícia", whatsapp: "15998763001" });
    const preservado = await novoPedido(banco, { nome: "Outra Pessoa Fictícia", whatsapp: "15998763002" });
    const anonima = await banco.guardarSimulacao(
      simular({ conta: 700, cidade: "Itu" }, numeros, HOJE),
    );

    const semAcesso = await excluir({ whatsapp: "15998763001", confirmacao: "EXCLUIR" });
    assert.equal(semAcesso.status, 401);

    const semConfirmar = await excluir({
      token: TOKEN_DONO,
      whatsapp: "15998763001",
      confirmacao: "excluir",
    });
    assert.equal(semConfirmar.status, 422);
    assert.equal(await banco.contarPedidos("15998763001"), 2);

    const resposta = await excluir({
      token: TOKEN_DONO,
      whatsapp: "(15) 99876-3001",
      confirmacao: "EXCLUIR",
    });
    assert.equal(resposta.status, 200);
    assert.deepEqual(resposta.corpo.removidos, { pedidos: 2, simulacoes: 2 });

    assert.equal(await banco.contarPedidos("15998763001"), 0);
    assert.equal(await existe(banco, "pedidos", alvo1.pedidoId), false);
    assert.equal(await existe(banco, "pedidos", alvo2.pedidoId), false);
    assert.equal(await existe(banco, "simulacoes", alvo1.simulacaoId), false);
    assert.equal(await existe(banco, "simulacoes", alvo2.simulacaoId), false);
    assert.equal(await existe(banco, "pedidos", preservado.pedidoId), true);
    assert.equal(await existe(banco, "simulacoes", preservado.simulacaoId), true);
    assert.equal(await existe(banco, "simulacoes", anonima), true);
  });
});
