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
create or replace function limpar_retencao(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pedidos_apagados integer;
  calculos_apagados integer;
begin
  delete from simulacoes
  where andamento <> 'fechou'
    and pedido_em < p_agora - interval '12 months';
  get diagnostics pedidos_apagados = row_count;

  delete from leads l
  where not exists (select 1 from simulacoes s where s.lead_id = l.id);

  delete from calculos c
  where c.criado_em < p_agora - interval '30 days'
    and not exists (select 1 from simulacoes s where s.calculo_id = c.id);
  get diagnostics calculos_apagados = row_count;

  return jsonb_build_object(
    'pedidos', pedidos_apagados,
    'simulacoes_sem_contato', calculos_apagados
  );
end;
$$;

revoke all on function limpar_retencao(timestamptz) from public;
grant execute on function limpar_retencao(timestamptz) to service_role;
create or replace function excluir_pessoa_por_whatsapp(p_whatsapp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pessoa_id uuid;
  calculos_ids uuid[];
  pedidos_apagados integer := 0;
  calculos_apagados integer := 0;
begin
  select id into pessoa_id
  from leads
  where whatsapp = p_whatsapp
  limit 1;

  if pessoa_id is null then
    return jsonb_build_object('pedidos', 0, 'simulacoes', 0);
  end if;

  select coalesce(array_agg(calculo_id) filter (where calculo_id is not null), '{}')
  into calculos_ids
  from simulacoes
  where lead_id = pessoa_id;

  delete from simulacoes where lead_id = pessoa_id;
  get diagnostics pedidos_apagados = row_count;

  delete from leads where id = pessoa_id;

  delete from calculos
  where id = any(calculos_ids)
    and not exists (select 1 from simulacoes where calculo_id = calculos.id);
  get diagnostics calculos_apagados = row_count;

  return jsonb_build_object(
    'pedidos', pedidos_apagados,
    'simulacoes', calculos_apagados
  );
end;
$$;

revoke all on function excluir_pessoa_por_whatsapp(text) from public;
grant execute on function excluir_pessoa_por_whatsapp(text) to service_role;
