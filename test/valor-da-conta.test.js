const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");

async function comServidor(fn) {
  const banco = await abrir();
  const srv = criarServidor({ banco, numeros, hoje: () => HOJE });
  await new Promise((ok) => srv.listen(0, ok));
  const base = `http://localhost:${srv.address().port}`;
  const simular = async (conta) => {
    const r = await fetch(base + "/api/simular", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta, cidade: "Sorocaba" }) });
    const corpo = await r.json();
    const { simulacao_id, ...resultado } = corpo;
    return { status: r.status, erro: corpo.erro, resultado };
  };
  try { await fn(simular); } finally { srv.close(); await banco.fechar(); }
}

// O valor da conta como a pessoa escreve no Brasil: R$ 1.234,56 é mil duzentos e trinta e quatro reais e cinquenta e seis centavos.
// A simulação de "1.234,56" tem de ser igual à de 1234.56, que é o que o simulador já entendia.
test("conta escrita no jeito brasileiro dá a mesma simulação que o número puro", async () => {
  await comServidor(async (simular) => {
    const esperado = await simular(1234.56);
    assert.equal(esperado.status, 200);
    for (const texto of ["R$ 1.234,56", "R$1.234,56", "1.234,56", "1234,56"]) {
      const r = await simular(texto);
      assert.equal(r.status, 200, `"${texto}" tem de ser aceito`);
      assert.deepEqual(r.resultado, esperado.resultado, `"${texto}" tem de dar a mesma simulação de 1234.56`);
    }
    const centavos = await simular("600,50");
    assert.deepEqual(centavos.resultado, (await simular(600.5)).resultado, '"600,50" vale 600.5');
    const milhar = await simular("1.234");
    assert.deepEqual(milhar.resultado, (await simular(1234)).resultado, '"1.234" é mil duzentos e trinta e quatro, não um vírgula duzentos e trinta e quatro');
  });
});

// Controles: o que já era recusado continua sendo
test("conta que não é número continua recusada", async () => {
  await comServidor(async (simular) => {
    for (const texto of ["", "abc", "R$", "1,2,3", "1.2.3", "1e3", "-50", 0, "0"]) {
      const r = await simular(texto);
      assert.equal(r.status, 422, `${JSON.stringify(texto)} tem de ser recusado`);
    }
  });
});

test("conta no formato já aceito continua valendo", async () => {
  await comServidor(async (simular) => {
    assert.equal((await simular(600)).status, 200);
    assert.equal((await simular("600")).status, 200);
    assert.equal((await simular("1234.56")).status, 200);
  });
});
