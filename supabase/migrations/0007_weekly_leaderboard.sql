-- Ranking semanal de faturamento, visivel para TODOS os funcionarios (nao
-- so financeiro/admin/manager). Como financial_entries tem RLS restrita a
-- quem ve financeiro, isso teria que passar por uma funcao SECURITY DEFINER
-- que expoe deliberadamente so nome+faturamento (nunca os custos), no mesmo
-- padrao ja usado em is_admin()/can_view_finance().

create or replace function public.get_weekly_leaderboard()
returns table (employee_id uuid, full_name text, faturamento numeric, week_start_date date)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, fe.faturamento, fe.week_start_date
  from public.financial_entries fe
  join public.profiles p on p.id = fe.employee_id
  where fe.week_start_date = (select max(week_start_date) from public.financial_entries)
  order by fe.faturamento desc;
$$;

grant execute on function public.get_weekly_leaderboard() to authenticated;
