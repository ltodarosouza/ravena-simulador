// Mostra o caso de referência (C1) e a linha que o banco guarda do pedido (C3). Uso: node scripts/evidencia.js
const fs = require("fs");
const path = require("path");
const { simular } = require("../lib/calculo");
const { abrir } = require("../lib/banco");
const numeros = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "referencia", "numeros.json"), "utf8")).numeros;
const hoje = new Date("2026-10-24T12:00:00-03:00");

(async () => {
  const sim = simular({ conta: 600, cidade: "Sorocaba" }, numeros, hoje);
  console.log("== C1: R$ 600 em Sorocaba, números congelados de referencia/numeros.json ==");
  console.log("tela (exibido):", JSON.stringify(sim.exibido, null, 2));
  console.log("internos sem arredondar:", JSON.stringify(sim.interno, null, 2));
  const r = sim.exibido.retorno;
  console.log(`retorno ${r.anos} anos e ${r.meses} meses; piso do critério: 3 anos -> ${r.total_meses >= 36 ? "PASSA" : "REPROVA"}`);

  const banco = await abrir();
  const id = await banco.guardarSimulacao(sim);
  const p = await banco.criarPedido({ simulacao_id: id, nome: "Maria Souza", whatsapp: "(15) 99876-5432" });
  const linha = await banco.pedido(p.id);
  console.log("\n== C3: linha do pedido no banco (tabela pedidos) ==");
  console.log(JSON.stringify(linha, null, 2));
  console.log("resultado do pedido igual ao da tela:", JSON.stringify(linha.resultado) === JSON.stringify(sim.exibido));
  await banco.fechar();
})();
