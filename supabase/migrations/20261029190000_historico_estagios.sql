create table historico_estagios (
  id uuid primary key default gen_random_uuid(),
  simulacao_id uuid not null references simulacoes(id) on delete cascade,
  de text not null,
  para text not null,
  alterado_por text not null,
  alterado_em timestamptz not null default now()
);

create index historico_estagios_simulacao on historico_estagios (simulacao_id, alterado_em desc);
alter table historico_estagios enable row level security;
