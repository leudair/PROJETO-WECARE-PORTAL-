-- Ate agora o "periodo" de cada lancamento financeiro era sempre uma semana
-- fixa (segunda a sabado), calculada somando 5 dias a week_start_date — a UI
-- so deixava escolher entre as ultimas semanas, sem liberdade real de data.
-- Agora o financeiro escolhe data de inicio E data de fim livremente (dois
-- campos de calendario), entao o fim precisa ser guardado de verdade em vez
-- de inferido. Lancamentos existentes sao preenchidos com a mesma regra de
-- antes (inicio + 5 dias) pra nao mudar o que ja foi lancado.

alter table public.financial_entries add column week_end_date date;

update public.financial_entries set week_end_date = week_start_date + 5;

alter table public.financial_entries alter column week_end_date set not null;

alter table public.financial_entries add constraint financial_entries_end_after_start
  check (week_end_date >= week_start_date);

-- get_weekly_leaderboard() (0007) tambem precisa expor week_end_date agora
-- que ele pode ser diferente de week_start_date + 5 — o podio da semana
-- (src/app/(employee)/dashboard/podium.tsx) usava essa conta fixa pra
-- mostrar o intervalo, o que ficaria errado com periodo livre. Precisa
-- dropar antes de recriar: postgres nao deixa mudar as colunas de retorno
-- de uma RETURNS TABLE so com CREATE OR REPLACE.
drop function if exists public.get_weekly_leaderboard();

create function public.get_weekly_leaderboard()
returns table (employee_id uuid, full_name text, faturamento numeric, week_start_date date, week_end_date date)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, fe.faturamento, fe.week_start_date, fe.week_end_date
  from public.financial_entries fe
  join public.profiles p on p.id = fe.employee_id
  where fe.week_start_date = (select max(week_start_date) from public.financial_entries)
  order by fe.faturamento desc;
$$;

grant execute on function public.get_weekly_leaderboard() to authenticated;
