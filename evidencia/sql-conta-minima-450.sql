-- Decisão do dono em 2026-10-30 (C2): a conta mínima do simulador passa de R$ 100 para R$ 450.
-- Linha nova com vigência de hoje; a de R$ 100 (vigência 2026-10-24) fica no histórico.
insert into numeros_calculo (chave, valor, vigencia, fonte)
values ('conta_minima', '450'::jsonb, '2026-10-30', 'decisão do dono em 2026-10-30: o mesmo mínimo da landing (brief); abaixo disso não compensa')
on conflict (chave, vigencia) do update set valor = excluded.valor, fonte = excluded.fonte;

insert into historico_numeros_calculo (chave, valor, vigencia, fonte, alterado_por)
values ('conta_minima', '450'::jsonb, '2026-10-30', 'decisão do dono em 2026-10-30: o mesmo mínimo da landing (brief); abaixo disso não compensa', 'dono');
