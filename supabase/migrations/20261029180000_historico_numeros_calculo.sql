create table historico_numeros_calculo (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  valor jsonb not null,
  vigencia date not null,
  fonte text not null,
  alterado_por text not null,
  alterado_em timestamptz not null default now()
);

alter table historico_numeros_calculo enable row level security;
