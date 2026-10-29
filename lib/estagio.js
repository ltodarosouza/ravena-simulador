const ESTAGIOS = ["chegou", "respondi", "visita_marcada", "proposta_enviada", "fechou", "nao_vai"];

const PARA_SUPABASE = {
  chegou: "novo",
  respondi: "respondido",
  visita_marcada: "visita_marcada",
  proposta_enviada: "proposta_enviada",
  fechou: "fechou",
  nao_vai: "desistiu",
};
const DO_SUPABASE = Object.fromEntries(Object.entries(PARA_SUPABASE).map(([painel, banco]) => [banco, painel]));

const estagioValido = (estagio) => ESTAGIOS.includes(estagio);
const paraSupabase = (estagio) => PARA_SUPABASE[estagio];
const doSupabase = (estagio) => DO_SUPABASE[estagio] || estagio;

module.exports = { ESTAGIOS, estagioValido, paraSupabase, doSupabase };
