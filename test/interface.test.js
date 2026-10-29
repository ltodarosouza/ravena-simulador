const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pagina = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const script = pagina.match(/<script>([\s\S]*?)<\/script>/)[1];

function contextoDaPagina(fetch) {
  const elemento = { addEventListener() {} };
  return vm.createContext({
    document: { getElementById: () => elemento },
    fetch,
  });
}

test("falha de conexão orienta a tentar de novo e nunca confirma sucesso", async () => {
  const contexto = contextoDaPagina(async () => {
    throw new Error("rede indisponível");
  });
  vm.runInContext(script, contexto);

  const resposta = await vm.runInContext(
    'enviar("/api/pedido", { nome: "Pessoa de Teste" })',
    contexto,
  );

  assert.equal(resposta.status, 0);
  assert.match(resposta.corpo.mensagem, /não foi possível concluir/i);
  assert.match(resposta.corpo.mensagem, /tente de novo/i);
  assert.doesNotMatch(resposta.corpo.mensagem, /recebemos|enviado|sucesso/i);
});
