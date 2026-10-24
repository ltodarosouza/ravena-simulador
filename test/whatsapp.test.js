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
  const post = async (rota, corpo) => {
    const r = await fetch(base + rota, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    return { status: r.status, corpo: await r.json() };
  };
  try { await fn({ banco, post }); } finally { srv.close(); await banco.fechar(); }
}

// Cenário 6: CPF válido no campo WhatsApp é recusado como "isso não é um telefone" e não é gravado.
// 52998224725 tem 11 dígitos e o terceiro é 9, então hoje passa como celular com DDD 52.
for (const [rotulo, zap] of [["só dígitos", "52998224725"], ["com pontos e traço", "529.982.247-25"]]) {
  test(`WhatsApp: CPF válido (${rotulo}) é recusado e não é gravado`, async () => {
    await comServidor(async ({ banco, post }) => {
      const sim = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
      const r = await post("/api/pedido", { simulacao_id: sim.corpo.simulacao_id, nome: "Maria Souza", whatsapp: zap });
      assert.equal(r.status, 422, "o pedido tem de ser recusado");
      assert.equal(r.corpo.erro, "whatsapp_parece_cpf");
      assert.match(r.corpo.mensagem, /parece um CPF/i);
      const gravado = JSON.stringify((await banco.db.query("select * from pedidos")).rows);
      assert.ok(!/52998224725/.test(gravado), "o CPF não foi gravado como WhatsApp");
      assert.equal((await banco.db.query("select count(*)::int n from pedidos")).rows[0].n, 0);
    });
  });
}

// Controles: o que já valia e tem de continuar valendo (cenário 7)
for (const [rotulo, zap, esperado] of [
  ["celular normal", "(15) 99876-5432", 201],
  ["com +55", "+55 (15) 99876-5432", 201],
  ["número de outro país", "+1 415 555 2671", 422],
]) {
  test(`WhatsApp, controle: ${rotulo}`, async () => {
    await comServidor(async ({ post }) => {
      const sim = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
      const r = await post("/api/pedido", { simulacao_id: sim.corpo.simulacao_id, nome: "Maria Souza", whatsapp: zap });
      assert.equal(r.status, esperado);
    });
  });
}
