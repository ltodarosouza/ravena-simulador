const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numeros = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8"),
).numeros;
const HOJE = new Date("2026-10-29T12:00:00-03:00");

async function comServidor(fn) {
  const banco = await abrir();
  const servidor = criarServidor({ banco, numeros, hoje: () => HOJE });
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const post = async (rota, corpo) => {
    const resposta = await fetch(base + rota, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    return { status: resposta.status, corpo: await resposta.json() };
  };
  try {
    await fn({ banco, post });
  } finally {
    servidor.close();
    await banco.fechar();
  }
}

test("a página explica o uso dos dados e o aceite começa desmarcado", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const campo = pagina.match(/<input[^>]*id="aceite-privacidade"[^>]*>/)?.[0] || "";

  assert.ok(/nome[^<]*WhatsApp|WhatsApp[^<]*nome/i.test(pagina), "diz quais dados pessoais serão usados");
  assert.ok(/atender|simulação detalhada/i.test(pagina), "diz para que os dados serão usados");
  assert.ok(/12 meses/i.test(pagina), "diz por quanto tempo um pedido que não fechou fica guardado");
  assert.ok(/exclusão/i.test(pagina), "explica que a pessoa pode pedir exclusão");
  assert.match(campo, /type="checkbox"/i);
  assert.match(campo, /required/i);
  assert.doesNotMatch(campo, /\schecked(?:\s|=|>)/i, "o aceite não pode vir marcado");
  assert.match(pagina, /aceite_privacidade:\s*\$\("aceite-privacidade"\)\.checked/, "a página envia a decisão");
});

test("o servidor não grava pedido sem aceite explícito", async () => {
  await comServidor(async ({ banco, post }) => {
    const simulacao = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
    const pedido = {
      simulacao_id: simulacao.corpo.simulacao_id,
      nome: "Pessoa de Teste",
      whatsapp: "11999999999",
    };

    for (const aceite_privacidade of [undefined, false, "true", 1]) {
      const resposta = await post("/api/pedido", { ...pedido, aceite_privacidade });
      assert.equal(resposta.status, 422);
      assert.equal(resposta.corpo.erro, "privacidade_nao_aceita");
    }
    assert.equal(await banco.contarPedidos(pedido.whatsapp), 0);

    const aceito = await post("/api/pedido", { ...pedido, aceite_privacidade: true });
    assert.equal(aceito.status, 201);
    assert.equal(await banco.contarPedidos(pedido.whatsapp), 1);
  });
});
