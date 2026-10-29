const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const referencia = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8"),
).numeros;
const HOJE = new Date("2026-10-29T12:00:00-03:00");
const TOKEN_DE_TESTE = "acesso-do-dono-somente-no-teste";

async function semearNumeros(banco) {
  for (const [chave, numero] of Object.entries(referencia)) {
    await banco.db.query(
      "insert into numeros_calculo (chave, valor, vigencia, fonte) values ($1, $2, $3, $4)",
      [chave, JSON.stringify(numero.valor), numero.vigencia, numero.fonte],
    );
  }
}

async function comServidor(fn) {
  const banco = await abrir();
  await semearNumeros(banco);
  const servidor = criarServidor({
    banco,
    numeros: (hoje) => banco.numerosVigentes(hoje),
    hoje: () => HOJE,
    donoToken: TOKEN_DE_TESTE,
  });
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
    await fn({ banco, chamar });
  } finally {
    servidor.close();
    await banco.fechar();
  }
}

test("a tela do dono tem os campos da tarifa e não contém segredo", () => {
  const caminho = path.join(__dirname, "..", "public", "dono.html");
  assert.ok(fs.existsSync(caminho), "a tela do dono ainda não existe");
  const pagina = fs.readFileSync(caminho, "utf8");
  for (const campo of ["acesso", "valor", "vigencia", "fonte"]) {
    assert.match(pagina, new RegExp(`id=["']${campo}["']`), `falta o campo ${campo}`);
  }
  assert.doesNotMatch(pagina, new RegExp(TOKEN_DE_TESTE), "o segredo não pode estar na página");
});

test("só o dono salva tarifa válida com fonte, e a mudança entra no cálculo e no histórico", async () => {
  await comServidor(async ({ chamar }) => {
    const antes = await chamar("/api/simular", {
      method: "POST",
      corpo: { conta: 600, cidade: "Sorocaba" },
    });

    const semAcesso = await chamar("/api/dono/tarifa", {
      method: "POST",
      corpo: { valor: 1.15, vigencia: "2026-10-29", fonte: "Fonte pública de teste" },
    });
    assert.equal(semAcesso.status, 401);

    for (const corpo of [
      { valor: 0, vigencia: "2026-10-29", fonte: "Fonte pública de teste" },
      { valor: -1, vigencia: "2026-10-29", fonte: "Fonte pública de teste" },
      { valor: 1.15, vigencia: "", fonte: "Fonte pública de teste" },
      { valor: 1.15, vigencia: "2026-10-29", fonte: "" },
    ]) {
      const invalido = await chamar("/api/dono/tarifa", {
        method: "POST",
        token: TOKEN_DE_TESTE,
        corpo,
      });
      assert.equal(invalido.status, 422);
    }

    const salvo = await chamar("/api/dono/tarifa", {
      method: "POST",
      token: TOKEN_DE_TESTE,
      corpo: { valor: 1.15, vigencia: "2026-10-29", fonte: "Fonte pública de teste" },
    });
    assert.equal(salvo.status, 201);

    const depois = await chamar("/api/simular", {
      method: "POST",
      corpo: { conta: 600, cidade: "Sorocaba" },
    });
    assert.notEqual(depois.corpo.kwp, antes.corpo.kwp, "a simulação usa a tarifa nova");

    const historico = await chamar("/api/dono/tarifa", { token: TOKEN_DE_TESTE });
    assert.equal(historico.status, 200);
    assert.equal(historico.corpo[0].valor, 1.15);
    assert.equal(historico.corpo[0].vigencia, "2026-10-29");
    assert.equal(historico.corpo[0].fonte, "Fonte pública de teste");
    assert.equal(historico.corpo[0].alterado_por, "dono");
  });
});
