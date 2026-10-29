const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");
// CPF de exemplo público, o mesmo de tutoriais e geradores de CPF. Não é de ninguém que a gente conheça. Os dígitos verificadores são válidos de propósito: o filtro só recusa CPF que passa na conta.
const CPF = "529.982.247-25";

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

// Cenário 3: o controle. Se este falhar, o ambiente do teste está quebrado, não a regra.
test("C5, controle: nome normal cria o pedido", async () => {
  await comServidor(async ({ banco, post }) => {
    const sim = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
    const r = await post("/api/pedido", { simulacao_id: sim.corpo.simulacao_id, nome: "Maria Souza", whatsapp: "15998765432" });
    assert.equal(r.status, 201);
    assert.equal(await banco.contarPedidos("15998765432"), 1);
  });
});

// Cenários 1, 2 e 5
for (const [rotulo, nome] of [
  ["com pontos e traço", CPF],
  ["só dígitos", "52998224725"],
  ["no meio de uma frase", `meu cpf é ${CPF}`],
  ["separado por espaços", "529 982 247 25"],
]) {
  test(`C5: CPF válido no campo nome (${rotulo}) é recusado e não entra em tabela nem log`, async () => {
    await comServidor(async ({ banco, post }) => {
      const sim = await post("/api/simular", { conta: 600, cidade: "Sorocaba" });
      const saidas = [];
      const antes = { log: console.log, error: console.error };
      console.log = console.error = (...a) => saidas.push(a.join(" "));
      let r;
      try { r = await post("/api/pedido", { simulacao_id: sim.corpo.simulacao_id, nome, whatsapp: "15998765432" }); }
      finally { console.log = antes.log; console.error = antes.error; }

      assert.equal(r.status, 422, "o pedido tem de ser recusado");
      assert.equal(r.corpo.erro, "nome_com_cpf");
      assert.match(r.corpo.mensagem, /só o seu nome/i, "a mensagem diz que só o nome é pedido");
      assert.equal(await banco.contarPedidos("15998765432"), 0, "nenhum pedido gravado");
      const texto = JSON.stringify((await banco.db.query("select * from pedidos")).rows) + JSON.stringify((await banco.db.query("select * from simulacoes")).rows);
      assert.ok(!/529.?982.?247.?25/.test(texto), "o CPF não aparece em nenhuma tabela");
      assert.ok(!/529.?982.?247.?25/.test(saidas.join("\n")), "o CPF não aparece em log");
    });
  });
}
