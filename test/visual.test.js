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
  try { await fn(`http://localhost:${srv.address().port}`); } finally { srv.close(); await banco.fechar(); }
}

test("as páginas recebem a folha de estilo e a logo da marca", async () => {
  await comServidor(async (base) => {
    const css = await fetch(base + "/ravena.css");
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /text\/css/);
    const logo = await fetch(base + "/logo.svg");
    assert.equal(logo.status, 200);
    assert.match(logo.headers.get("content-type"), /image\/svg\+xml/);
    const icone = await fetch(base + "/icone.svg");
    assert.equal(icone.status, 200);
    assert.match(icone.headers.get("content-type"), /image\/svg\+xml/);
  });
});

test("nenhuma tela depende de CSS ou script vindo de outro site", () => {
  for (const nome of ["index.html", "painel.html", "dono.html"]) {
    const pagina = fs.readFileSync(path.join(__dirname, "..", "public", nome), "utf8");
    assert.doesNotMatch(pagina, /(href|src)="https?:/, `${nome} carrega algo de fora`);
    assert.match(pagina, /href="\/ravena\.css"/, `${nome} sem a folha da marca`);
    assert.match(pagina, /<link rel="icon" type="image\/svg\+xml" href="\/icone\.svg">/, `${nome} sem o ícone da aba`);
  }
});

// Spec, seção 2: fora da faixa o simulador explica o motivo. A faixa vem dos números cadastrados, não do texto.
test("conta fora da faixa diz quais são os limites cadastrados", async () => {
  await comServidor(async (base) => {
    const r = await fetch(base + "/api/simular", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta: 5, cidade: "Sorocaba" }) });
    const corpo = await r.json();
    assert.equal(r.status, 422);
    assert.match(corpo.mensagem, /R\$ 450/);
    assert.match(corpo.mensagem, /R\$ 2\.000/);
  });
});

test("o pedido só confirma sucesso quando o servidor aceitou", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  assert.match(pagina, /status === 201/);
});
