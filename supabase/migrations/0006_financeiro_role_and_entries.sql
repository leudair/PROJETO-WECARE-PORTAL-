-- Papel "financeiro": acesso restrito so ao painel financeiro (nao ve
-- funcionarios, mensagens nem a Visao Geral de admin). CEO e Gerente
-- tambem podem ver o financeiro, alem do resto que ja tinham.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('employee', 'admin', 'manager', 'financeiro'));

create or replace function public.can_view_finance()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager', 'financeiro')
  );
$$;

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  week_start_date date not null,
  faturamento numeric(12, 2) not null check (faturamento >= 0),
  custo_operacional numeric(12, 2) not null check (custo_operacional >= 0),
  custo_anuncios numeric(12, 2) not null check (custo_anuncios >= 0),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, week_start_date)
);

create index financial_entries_employee_id_idx on public.financial_entries (employee_id);

create trigger financial_entries_set_updated_at
  before update on public.financial_entries
  for each row execute function public.set_updated_at();

alter table public.financial_entries enable row level security;

create policy financial_entries_view on public.financial_entries
  for select using (public.can_view_finance());

create policy financial_entries_write on public.financial_entries
  for insert with check (public.can_view_finance());

create policy financial_entries_update on public.financial_entries
  for update using (public.can_view_finance()) with check (public.can_view_finance());

create policy financial_entries_delete on public.financial_entries
  for delete using (public.can_view_finance());
