-- Simulador da Ravena Solar (P2) no mesmo banco da landing (P1).
-- Roda DEPOIS de 20261022150000_cria_leads_e_simulacoes.sql (está em landing-solar/supabase/migrations).
-- Aqui, "pedido de simulação detalhada" = uma linha de `simulacoes`, como já era na P1.
-- `andamento` já tem os seis estágios do painel: novo=chegou, respondido=respondi,
-- visita_marcada, proposta_enviada, fechou, desistiu=não vai.

-- 1. A P1 só aceitava conta de R$ 450 para cima. O simulador atende de R$ 100 a R$ 2.000,
--    e essa faixa é número do dono (muda sem programador), então o banco só exige conta positiva.
alter table simulacoes drop constraint if exists simulacoes_conta_mensal_check;
alter table simulacoes add constraint simulacoes_conta_mensal_check check (conta_mensal > 0);

-- 2. O que a pessoa viu e os números usados, guardados no pedido (nunca recalculados depois).
--    Pedidos antigos da P1 ficam sem isso; os da P2 têm sempre os dois.
alter table simulacoes
  add column resultado jsonb,
  add column numeros jsonb,
  add constraint simulacoes_resultado_e_numeros_juntos check ((resultado is null) = (numeros is null));

-- 3. Cada simulação mostrada na tela, antes de a pessoa deixar nome e WhatsApp.
--    Não tem dado pessoal. O pedido aponta para a que a pessoa viu.
create table calculos (
  id uuid primary key default gen_random_uuid(),
  cidade text not null references cidades (nome),
  conta_mensal numeric(10, 2) not null check (conta_mensal > 0),
  resultado jsonb not null,
  numeros jsonb not null,
  criado_em timestamptz not null default now()
);
alter table simulacoes add column calculo_id uuid references calculos (id);
create index simulacoes_calculo_idx on simulacoes (calculo_id);

-- Segurança ligada, sem regra de acesso: só o servidor, com a chave secreta, grava e lê.
alter table calculos enable row level security;
