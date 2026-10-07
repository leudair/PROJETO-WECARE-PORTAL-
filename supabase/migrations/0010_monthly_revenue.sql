-- Faturamento mensal: alem do lancamento semanal (financial_entries), o
-- financeiro tambem quer registrar o faturamento total do mes de cada
-- funcionaria, numa tela separada ("Faturamento mensal").

create table public.monthly_revenue_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  month_start_date date not null,
  faturamento numeric(12, 2) not null check (faturamento >= 0),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, month_start_date)
);

create index monthly_revenue_entries_employee_id_idx on public.monthly_revenue_entries (employee_id);

create trigger monthly_revenue_entries_set_updated_at
  before update on public.monthly_revenue_entries
  for each row execute function public.set_updated_at();

alter table public.monthly_revenue_entries enable row level security;

create policy monthly_revenue_entries_view on public.monthly_revenue_entries
  for select using (public.can_view_finance());

create policy monthly_revenue_entries_write on public.monthly_revenue_entries
  for insert with check (public.can_view_finance());

create policy monthly_revenue_entries_update on public.monthly_revenue_entries
  for update using (public.can_view_finance()) with check (public.can_view_finance());

create policy monthly_revenue_entries_delete on public.monthly_revenue_entries
  for delete using (public.can_view_finance());
