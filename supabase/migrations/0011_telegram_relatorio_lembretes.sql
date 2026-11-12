-- 1) Guardar no lembrete o que foi mostrado na hora do envio
alter table public.telegram_lembretes
  add column if not exists ultima_compra_valor numeric,
  add column if not exists valor_sugerido numeric,
  add column if not exists cliente_instagram text,
  add column if not exists cliente_tipo text;

-- 2) Relatório: um lembrete por linha, com a vendedora e se o cliente comprou depois
create or replace view public.telegram_relatorio_lembretes
with (security_invoker = true) as
select
  l.id,
  f.codigo                     as vendedora_codigo,
  f.nome                       as vendedora,
  f.telefone                   as vendedora_telefone,
  l.cliente_nome,
  l.cliente_telefone,
  l.cliente_instagram,
  l.ultima_compra_valor,
  l.valor_sugerido,
  l.enviado_em,
  date_trunc('month', l.enviado_em at time zone 'America/Sao_Paulo')::date as mes,
  nv.valor                     as venda_depois_valor,
  nv.quando                    as venda_depois_em,
  (nv.valor is not null)       as comprou_depois
from public.telegram_lembretes l
join public.wa_funcionarios f on f.id = l.funcionario_id
left join lateral (
  select x.valor, x.quando from (
    select p.valor, coalesce(p.pago_em, p.criado_em) as quando
      from public.wa_pedidos p
     where p.status in ('pago','executado')
       and right(regexp_replace(p.telefone,'\D','','g'),8) = right(regexp_replace(l.cliente_telefone,'\D','','g'),8)
       and coalesce(p.pago_em, p.criado_em) > l.enviado_em
    union all
    select c.last_purchase_value, c.updated_at
      from public.contacts c
     where right(regexp_replace(c.phone,'\D','','g'),8) = right(regexp_replace(l.cliente_telefone,'\D','','g'),8)
       and c.updated_at > l.enviado_em
       and c.last_purchase_value is not null
       and c.last_purchase_value is distinct from l.ultima_compra_valor
  ) x order by x.quando limit 1
) nv on true
where l.status = 'enviado';

-- 3) Resumo do mês por vendedora
create or replace view public.telegram_relatorio_mensal
with (security_invoker = true) as
select mes, vendedora_codigo, vendedora, vendedora_telefone,
       count(*)                                   as lembretes_enviados,
       count(*) filter (where comprou_depois)     as compraram_depois,
       round(100.0 * count(*) filter (where comprou_depois) / nullif(count(*),0), 1) as taxa_pct,
       coalesce(sum(venda_depois_valor),0)        as total_vendido_depois,
       coalesce(sum(ultima_compra_valor),0)       as soma_ultimas_compras,
       coalesce(sum(valor_sugerido),0)            as soma_sugerido
from public.telegram_relatorio_lembretes
group by 1,2,3,4;

-- 4) Segurança: só o servidor (bot e Portal com chave de serviço) lê esses dados
alter table public.telegram_lembretes enable row level security;
revoke all on public.telegram_relatorio_lembretes from anon, authenticated;
revoke all on public.telegram_relatorio_mensal from anon, authenticated;
