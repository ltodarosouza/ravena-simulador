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
