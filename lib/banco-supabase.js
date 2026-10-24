// O banco de verdade: o Supabase da landing (P1), com a chave secreta só no servidor.
// Mesma interface de lib/banco.js. Aqui o "pedido" é uma linha de `simulacoes`; a pessoa é um `lead`.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { normalizarWhatsapp } = require("./banco");

function lerEnv() {
  const env = { ...process.env };
  try {
    for (const linha of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
      const m = linha.match(/^\s*([A-Za-z_]+)\s*=\s*(.*?)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}

function configurado() {
  const e = lerEnv();
  return Boolean(e.SUPABASE_URL && e.SUPABASE_SECRET_KEY);
}

function abrir() {
  const e = lerEnv();
  if (!e.SUPABASE_URL || !e.SUPABASE_SECRET_KEY) throw new Error("faltam SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local");
  const sb = createClient(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const ok = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

  async function guardarSimulacao(sim) {
    const [linha] = ok(await sb.from("calculos").insert({
      cidade: sim.entrada.cidade, conta_mensal: sim.entrada.conta, resultado: sim.exibido, numeros: sim.numeros_usados,
    }).select("id"));
    return linha.id;
  }

  async function criarPedido({ simulacao_id, nome, whatsapp }) {
    const nomeLimpo = String(nome || "").trim();
    if (nomeLimpo.length < 2) return { erro: "nome_vazio" };
    const zap = normalizarWhatsapp(whatsapp);
    if (!zap) return { erro: "whatsapp_invalido" };
    const calculo = ok(await sb.from("calculos").select("*").eq("id", simulacao_id).maybeSingle());
    if (!calculo) return { erro: "simulacao_inexistente" };

    // a pessoa já é lead se o WhatsApp já existe (o mesmo número é o mesmo lead)
    let lead = ok(await sb.from("leads").select("id").eq("whatsapp", zap).maybeSingle());
    if (lead) {
      const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const recente = ok(await sb.from("simulacoes").select("id").eq("lead_id", lead.id).gt("pedido_em", desde).limit(1));
      if (recente.length) return { duplicado: true, id: recente[0].id };
    } else {
      [lead] = ok(await sb.from("leads").insert({ nome: nomeLimpo, whatsapp: zap }).select("id"));
    }
    const [pedido] = ok(await sb.from("simulacoes").insert({
      lead_id: lead.id, cidade: calculo.cidade, conta_mensal: calculo.conta_mensal,
      resultado: calculo.resultado, numeros: calculo.numeros, calculo_id: calculo.id,
    }).select("id"));
    return { id: pedido.id };
  }

  async function pedido(id) {
    const s = ok(await sb.from("simulacoes").select("*, leads(nome, whatsapp)").eq("id", id).maybeSingle());
    if (!s) return null;
    return { id: s.id, nome: s.leads.nome, whatsapp: s.leads.whatsapp, cidade: s.cidade, conta: s.conta_mensal,
             resultado: s.resultado, numeros: s.numeros, estagio: s.andamento };
  }

  // auxiliares dos testes, que usam WhatsApp inventado e limpam o que criaram
  const leadDe = async (zap) => ok(await sb.from("leads").select("id").eq("whatsapp", zap).maybeSingle());
  async function contarPedidos(zap) {
    const l = await leadDe(zap);
    if (!l) return 0;
    return ok(await sb.from("simulacoes").select("id").eq("lead_id", l.id)).length;
  }
  async function envelhecerPedidos(zap, horas) {
    const l = await leadDe(zap);
    ok(await sb.from("simulacoes").update({ pedido_em: new Date(Date.now() - horas * 3600 * 1000).toISOString() }).eq("lead_id", l.id));
  }
  async function limpar(zap, calculoIds) {
    const l = await leadDe(zap);
    if (l) {
      ok(await sb.from("simulacoes").delete().eq("lead_id", l.id));
      ok(await sb.from("leads").delete().eq("id", l.id));
    }
    if (calculoIds.length) ok(await sb.from("calculos").delete().in("id", calculoIds));
  }

  return { guardarSimulacao, criarPedido, pedido, contarPedidos, envelhecerPedidos, limpar, fechar: async () => {} };
}

module.exports = { abrir, configurado };
