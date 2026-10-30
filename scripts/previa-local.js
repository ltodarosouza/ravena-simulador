// Prévia das telas na máquina: banco de teste em memória, números de teste e pedidos fictícios. Nunca toca no Supabase.
const fs = require("fs");
const path = require("path");
const { abrir } = require("../lib/banco");
const { simular } = require("../lib/calculo");
const { criarServidor } = require("../server");

const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const HOJE = new Date("2026-10-24T12:00:00-03:00");
const ACESSOS = { dono: "previa-dono", carlos: "previa-carlos", renata: "previa-renata" };

(async () => {
  const banco = await abrir();
  const pessoas = [
    [600, "Sorocaba", "Maria Fictícia", "15990000001"],
    [980, "Votorantim", "João Fictício", "15990000002"],
    [1450, "Sorocaba", "Ana Fictícia", "15990000003"],
    [700, "Itu", "Pedro Fictício", "11990000004"],
  ];
  for (const [conta, cidade, nome, whatsapp] of pessoas) {
    const simulacao_id = await banco.guardarSimulacao(simular({ conta, cidade }, numeros, HOJE));
    await banco.criarPedido({ simulacao_id, nome, whatsapp });
  }
  await banco.salvarNumero({ chave: "tarifa_kwh", valor: 0.95, vigencia: "2026-01-01", fonte: "valor de teste", alterado_por: "dono" });
  const porta = Number(process.env.PORT) || 4310;
  criarServidor({ banco, numeros, hoje: () => HOJE, donoToken: ACESSOS.dono, acessos: ACESSOS })
    .listen(porta, () => console.log(`prévia em http://localhost:${porta}`));
})();
