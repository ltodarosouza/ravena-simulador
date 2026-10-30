// Cadastra no banco os números do dono que têm fonte firme (brief, spec, lei, regra da ANEEL).
// Os que dependem de leitura de tarifa, da prefeitura ou de decisão de preço NÃO estão aqui de propósito.
const supabase = require("../lib/banco-supabase");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs"), path = require("path");

const numeros = [
  ["geracao_kwh_por_kwp_mes", 115, "2026-10-24", "planilha do Carlos (brief da P2): 115 kWh por kWp por mês"],
  ["potencia_painel_kwp", 0.55, "2026-10-24", "painel de 550 W (brief da P2)"],
  ["limite_retorno_anos", 6, "2026-10-24", "decisão da spec do simulador, seção 3: acima disso não compensa"],
  ["reajuste_tarifa_anual", 0, "2026-10-24", "decisão da spec do simulador, seção 3: reajuste zero para errar contra a empresa"],
  ["conta_minima", 100, "2026-10-24", "decisão da spec do simulador, seção 2"],
  ["conta_minima", 450, "2026-10-30", "decisão do dono em 2026-10-30: o mesmo mínimo da landing (brief); abaixo disso não compensa"],
  ["conta_maxima", 2000, "2026-10-24", "decisão da spec do simulador, seção 2"],
  ["disponibilidade_kwh_bifasica", 50, "2026-10-24", "custo de disponibilidade da ligação bifásica: 50 kWh (regra da ANEEL, REN 1.000/2021)"],
  ["fio_b_percentual_por_ano", { 2026: 0.6, 2027: 0.75, 2028: 0.9, 2029: 1 }, "2026-01-01", "cronograma da Lei 14.300/2022 (60% em 2026, 75%, 90% e 100% em 2029)"],
];

(async () => {
  const env = {}; // lê o .env.local sem imprimir nada
  for (const l of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Za-z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2];
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const r = await sb.from("numeros_calculo").upsert(
    numeros.map(([chave, valor, vigencia, fonte]) => ({ chave, valor, vigencia, fonte })), { onConflict: "chave,vigencia" }).select("chave");
  if (r.error) { console.error("erro:", r.error.message); process.exit(1); }
  console.log("cadastrados:", r.data.map((x) => x.chave).join(", "));
})();
