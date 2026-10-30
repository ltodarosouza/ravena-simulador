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
