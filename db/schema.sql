-- Postgres. O mesmo SQL vale no banco de teste (PGlite) e, depois, num Postgres hospedado.
create table if not exists simulacoes (
  id uuid primary key default gen_random_uuid(),
  conta numeric not null,
  cidade text not null,
  resultado jsonb not null,
  numeros jsonb not null,
  criado_em timestamptz not null default now()
);

-- O pedido guarda o que a pessoa viu e os números usados. Não é recalculado depois.
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  simulacao_id uuid not null references simulacoes(id),
  nome text not null,
  whatsapp text not null,
  cidade text not null,
  conta numeric not null,
  resultado jsonb not null,
  numeros jsonb not null,
  estagio text not null default 'chegou',
  criado_em timestamptz not null default now()
);

create index if not exists pedidos_whatsapp_criado on pedidos (whatsapp, criado_em);
