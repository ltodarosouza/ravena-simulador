const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { simular, SemValor } = require("../lib/calculo");
const { abrir } = require("../lib/banco");
const { criarServidor } = require("../server");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");
const semOsDois = (() => { const { fio_b_kwh, iluminacao_publica, ...resto } = numeros; return resto; })();
const comZero = { ...semOsDois, fio_b_kwh: { ...numeros.fio_b_kwh, valor: 0.000001 }, iluminacao_publica: { ...numeros.iluminacao_publica, valor: { Sorocaba: 0, Votorantim: 0, Itu: 0, Salto: 0 } } };

// C8. Sem Fio B e sem iluminação o simulador responde, com aviso, e a conta é a de quem tem os dois valendo zero.
test("C8: sem Fio B e sem iluminação o cálculo responde e avisa o que ficou de fora", () => {
  const r = simular({ conta: 600, cidade: "Sorocaba" }, semOsDois, HOJE);
  assert.ok(!r.erro);
  assert.deepEqual(r.exibido.sem_numero, ["fio_b_kwh", "iluminacao_publica"]);
  const igual = simular({ conta: 600, cidade: "Sorocaba" }, comZero, HOJE);
  assert.equal(r.exibido.conta_depois, igual.exibido.conta_depois);
  assert.equal(r.exibido.investimento, igual.exibido.investimento);
});

test("C8: com o Fio B e a iluminação cadastrados o aviso some", () => {
  const r = simular({ conta: 600, cidade: "Sorocaba" }, numeros, HOJE);
  assert.equal(r.exibido.sem_numero, undefined);
});

test("C8: só o Fio B ou só a iluminação faltando lista só o que falta", () => {
  const { fio_b_kwh, ...semFio } = numeros;
  assert.deepEqual(simular({ conta: 600, cidade: "Sorocaba" }, semFio, HOJE).exibido.sem_numero, ["fio_b_kwh"]);
  const { iluminacao_publica, ...semIlum } = numeros;
  assert.deepEqual(simular({ conta: 600, cidade: "Sorocaba" }, semIlum, HOJE).exibido.sem_numero, ["iluminacao_publica"]);
});

test("C8: a exceção vale só para esses dois; sem tarifa o simulador continua sem responder", () => {
  const { tarifa_kwh, ...semTarifa } = semOsDois;
  assert.throws(() => simular({ conta: 600, cidade: "Sorocaba" }, semTarifa, HOJE), SemValor);
});

test("C8: um Fio B cadastrado com valor absurdo continua recusado (só a falta é tolerada)", () => {
  const ruim = { ...semOsDois, fio_b_kwh: { valor: -1, vigencia: "2026-01-01", fonte: "x" } };
  assert.throws(() => simular({ conta: 600, cidade: "Sorocaba" }, ruim, HOJE), SemValor);
});

test("C8: /api/simular devolve 200 com o aviso quando faltam os dois", async () => {
  const banco = await abrir();
  const srv = criarServidor({ banco, numeros: async () => semOsDois, hoje: () => HOJE });
  await new Promise((ok) => srv.listen(0, ok));
  try {
    const r = await fetch(`http://localhost:${srv.address().port}/api/simular`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta: 600, cidade: "Sorocaba" }) });
    const corpo = await r.json();
    assert.equal(r.status, 200);
    assert.deepEqual(corpo.sem_numero, ["fio_b_kwh", "iluminacao_publica"]);
  } finally { srv.close(); await banco.fechar(); }
});

// A pessoa vê o aviso: o texto existe na página, começa escondido e só aparece quando a resposta traz `sem_numero`.
test("C8: a página tem o aviso de itens fora da conta, escondido por padrão e ligado a sem_numero", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  assert.match(pagina, /<p id="aviso-sem-numero"[^>]*\bhidden\b[^>]*>[\s\S]*?Fio B[\s\S]*?iluminação pública[\s\S]*?<\/p>/);
  assert.match(pagina, /\$\("aviso-sem-numero"\)\.hidden = !\(corpo\.sem_numero && corpo\.sem_numero\.length\)/);
});
