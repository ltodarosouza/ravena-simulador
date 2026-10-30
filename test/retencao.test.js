const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { abrir } = require("../lib/banco");
const { simular } = require("../lib/calculo");

const numeros = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8"),
).numeros;
const AGORA = new Date("2026-10-29T12:00:00-03:00");

async function pedidoEm(banco, { whatsapp, criadoEm, estagio = "chegou" }) {
  const simulacaoId = await banco.guardarSimulacao(simular({ conta: 600, cidade: "Sorocaba" }, numeros, AGORA));
  const { id } = await banco.criarPedido({ simulacao_id: simulacaoId, nome: "Pessoa de teste", whatsapp });
  assert.ok(id);
  await banco.db.query("update pedidos set criado_em = $2, estagio = $3 where id = $1", [id, criadoEm, estagio]);
  await banco.db.query("update simulacoes set criado_em = $2 where id = $1", [simulacaoId, criadoEm]);
  return { id, simulacaoId };
}

async function simulacaoEm(banco, criadoEm) {
  const id = await banco.guardarSimulacao(simular({ conta: 600, cidade: "Sorocaba" }, numeros, AGORA));
  await banco.db.query("update simulacoes set criado_em = $2 where id = $1", [id, criadoEm]);
  return id;
}

const existe = async (banco, tabela, id) => Boolean((await banco.db.query(`select id from ${tabela} where id = $1`, [id])).rows.length);

test("retenção apaga só o que venceu e preserva pedidos fechados", async () => {
  const banco = await abrir();
  try {
    const vencido = await pedidoEm(banco, {
      whatsapp: "15998762001",
      criadoEm: "2025-10-28T12:00:00-03:00",
    });
    const noLimite = await pedidoEm(banco, {
      whatsapp: "15998762002",
      criadoEm: "2025-10-30T12:00:00-03:00",
    });
    const fechadoAntigo = await pedidoEm(banco, {
      whatsapp: "15998762003",
      criadoEm: "2024-10-29T12:00:00-03:00",
      estagio: "fechou",
    });
    const orfaVencida = await simulacaoEm(banco, "2026-09-28T12:00:00-03:00");
    const orfaNoLimite = await simulacaoEm(banco, "2026-09-30T12:00:00-03:00");

    const resultado = await banco.limparRetencao(AGORA);

    assert.deepEqual(resultado, { pedidos: 1, simulacoes_sem_contato: 1 });
    assert.equal(await existe(banco, "pedidos", vencido.id), false);
    assert.equal(await existe(banco, "simulacoes", vencido.simulacaoId), false);
    assert.equal(await existe(banco, "pedidos", noLimite.id), true);
    assert.equal(await existe(banco, "pedidos", fechadoAntigo.id), true);
    assert.equal(await existe(banco, "simulacoes", fechadoAntigo.simulacaoId), true);
    assert.equal(await existe(banco, "simulacoes", orfaVencida), false);
    assert.equal(await existe(banco, "simulacoes", orfaNoLimite), true);
  } finally {
    await banco.fechar();
  }
});
