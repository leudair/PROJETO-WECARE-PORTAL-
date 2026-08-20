-- Adiciona o papel "manager" (gerente) e uma tabela de avisos direcionados
-- a um funcionario especifico, escritos pelo admin/gerente.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('employee', 'admin', 'manager'));

-- is_admin() ja e usado nas policies existentes para "quem tem acesso total";
-- redefinido para tambem cobrir manager, sem precisar tocar nas policies antigas.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$;

create table public.employee_notices (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index employee_notices_employee_id_idx on public.employee_notices (employee_id);

alter table public.employee_notices enable row level security;

-- funcionario ve os proprios avisos e pode marcar como lido (mas nao criar/editar o texto)
create policy employee_notices_own_select on public.employee_notices
  for select using (employee_id = auth.uid() or public.is_admin());

create policy employee_notices_own_mark_read on public.employee_notices
  for update using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- RLS e' por linha; sem isso o funcionario tambem poderia reescrever o
-- texto do proprio aviso via update direto na API. Restringe a coluna.
revoke update on public.employee_notices from authenticated;
grant update (read_at) on public.employee_notices to authenticated;

-- so admin/gerente cria avisos
create policy employee_notices_admin_insert on public.employee_notices
  for insert with check (public.is_admin());

create policy employee_notices_admin_delete on public.employee_notices
  for delete using (public.is_admin());
