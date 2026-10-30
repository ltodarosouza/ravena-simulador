// O banco de verdade: o Supabase da landing (P1), com a chave secreta só no servidor.
// Mesma interface de lib/banco.js. Aqui o "pedido" é uma linha de `simulacoes`; a pessoa é um `lead`.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { normalizarWhatsapp, ehUuid } = require("./banco");
const { erroDoNome, whatsappParecidoCpf } = require("./dado-pessoal");
const { cidadesVisiveis } = require("./acesso");
const { paraSupabase, doSupabase } = require("./estagio");

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
    const erroNome = erroDoNome(nomeLimpo, 2); // a tabela leads da P1 exige 2 letras ou mais
    if (erroNome) return { erro: erroNome };
    if (whatsappParecidoCpf(whatsapp)) return { erro: "whatsapp_parece_cpf" };
    const zap = normalizarWhatsapp(whatsapp);
    if (!zap) return { erro: "whatsapp_invalido" };
    if (!ehUuid(simulacao_id)) return { erro: "simulacao_inexistente" };
    const calculo = ok(await sb.from("calculos").select("*").eq("id", simulacao_id).maybeSingle());
    if (!calculo) return { erro: "simulacao_inexistente" };
    if (calculo.resultado && calculo.resultado.nao_compensa) return { erro: "nao_compensa" }; // quem não compensa não deixa contato

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

  const comoPedido = (s) => (s ? { id: s.id, nome: s.leads.nome, whatsapp: s.leads.whatsapp, cidade: s.cidade, conta: s.conta_mensal,
                                   resultado: s.resultado, numeros: s.numeros, estagio: doSupabase(s.andamento) } : null);

  async function pedido(id) {
    return comoPedido(ok(await sb.from("simulacoes").select("*, leads(nome, whatsapp)").eq("id", id).maybeSingle()));
  }

  // C4: a regra de quem vê está na própria consulta. Quem não pode ver recebe null, igual a um pedido que não existe.
  // (Lido, não executado contra o Supabase real: o teste roda no banco de teste.)
  async function pedidoPara(quem, id) {
    const cidades = cidadesVisiveis(quem);
    if (cidades !== null && cidades.length === 0) return null;
    if (!ehUuid(id)) return null;
    let q = sb.from("simulacoes").select("*, leads(nome, whatsapp)").eq("id", id);
    if (cidades !== null) q = q.in("cidade", cidades);
    return comoPedido(ok(await q.maybeSingle()));
  }

  async function listarPedidosPara(quem) {
    const cidades = cidadesVisiveis(quem);
    if (cidades !== null && cidades.length === 0) return [];
    let q = sb.from("simulacoes").select("*, leads(nome, whatsapp)").order("pedido_em", { ascending: false });
    if (cidades !== null) q = q.in("cidade", cidades);
    return ok(await q).map(comoPedido);
  }

  async function alterarEstagioPara(quem, id, para) {
    if (!ehUuid(id)) return null;
    const cidades = cidadesVisiveis(quem);
    if (cidades !== null && cidades.length === 0) return null;
    const atual = await pedidoPara(quem, id);
    if (!atual) return null;
    let q = sb.from("simulacoes").update({ andamento: paraSupabase(para) }).eq("id", id);
    if (cidades !== null) q = q.in("cidade", cidades);
    const alteradas = ok(await q.select("id"));
    if (!alteradas.length) return null;
    ok(await sb.from("historico_estagios").insert({
      simulacao_id: id,
      de: atual.estagio,
      para,
      alterado_por: quem.papel === "dono" ? "dono" : quem.nome,
    }));
    return pedidoPara(quem, id);
  }

  async function historicoEstagioPara(quem, id) {
    if (!await pedidoPara(quem, id)) return null;
    return ok(await sb.from("historico_estagios")
      .select("de, para, alterado_por, alterado_em")
      .eq("simulacao_id", id)
      .order("alterado_em", { ascending: false }));
  }

  async function limparRetencao(agora = new Date()) {
    return ok(await sb.rpc("limpar_retencao", { p_agora: agora.toISOString() }));
  }

  async function excluirPessoaPorWhatsapp(whatsapp) {
    const zap = normalizarWhatsapp(whatsapp);
    if (!zap) return null;
    return ok(await sb.rpc("excluir_pessoa_por_whatsapp", { p_whatsapp: zap }));
  }

  // auxiliares dos testes, que usam WhatsApp inventado e limpam o que criaram
  const leadDe = async (zap) => ok(await sb.from("leads").select("id").eq("whatsapp", zap).maybeSingle());
  async function contarPedidos(zap) {
    const l = await leadDe(zap);
    if (!l) return 0;
    return ok(await sb.from("simulacoes").select("id").eq("lead_id", l.id)).length;
  }
  async function ultimoPedidoDe(zap) {
    const l = await leadDe(zap);
    if (!l) return null;
    const [s] = ok(await sb.from("simulacoes").select("id").eq("lead_id", l.id).order("pedido_em", { ascending: false }).limit(1));
    return s ? pedido(s.id) : null;
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

  // Para cada chave, a linha de maior vigência que já começou. Chave sem linha fica de fora (o cálculo recusa).
  async function numerosVigentes(hoje = new Date()) {
    const dia = hoje.toISOString().slice(0, 10);
    const linhas = ok(await sb.from("numeros_calculo").select("chave, valor, vigencia, fonte").lte("vigencia", dia).order("vigencia", { ascending: true }));
    const n = {};
    for (const l of linhas) n[l.chave] = { valor: l.valor, vigencia: l.vigencia, fonte: l.fonte };
    return n;
  }

  async function salvarNumero({ chave, valor, vigencia, fonte, alterado_por }) {
    ok(await sb.from("numeros_calculo").upsert(
      { chave, valor, vigencia, fonte },
      { onConflict: "chave,vigencia" },
    ));
    ok(await sb.from("historico_numeros_calculo").insert({
      chave, valor, vigencia, fonte, alterado_por,
    }));
  }

  async function historicoNumero(chave) {
    return ok(await sb.from("historico_numeros_calculo")
      .select("valor, vigencia, fonte, alterado_por, alterado_em")
      .eq("chave", chave)
      .order("alterado_em", { ascending: false }));
  }

  return {
    numerosVigentes, salvarNumero, historicoNumero, guardarSimulacao, criarPedido, pedido,
    pedidoPara, listarPedidosPara, alterarEstagioPara, historicoEstagioPara,
    limparRetencao, excluirPessoaPorWhatsapp, contarPedidos, ultimoPedidoDe,
    envelhecerPedidos, limpar, fechar: async () => {},
  };
}

module.exports = { abrir, configurado, lerEnv };
