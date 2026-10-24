-- Números de cálculo do simulador: quem digita é o dono, cada um com data de vigência e fonte.
-- Vazia de propósito: sem número vigente, o simulador não responde (critério C6 da spec).
-- O simulador usa, para cada chave, a linha de maior vigência que já começou.
create table numeros_calculo (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  valor jsonb not null,
  vigencia date not null,
  fonte text not null check (char_length(btrim(fonte)) >= 3),
  criado_em timestamptz not null default now(),
  unique (chave, vigencia)
);
alter table numeros_calculo enable row level security;
