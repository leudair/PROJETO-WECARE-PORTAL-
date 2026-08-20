-- WeCare Portal — schema inicial
-- profiles: um por funcionario/admin (id = auth.users.id)
-- contacts: clientes/leads cadastrados por um funcionario
-- message_templates: textos padrao do funil de lead (estagios 2 a 6)
-- reminder_dispatches: log de cada disparo de lembrete via Z-API e sua resposta

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  whatsapp_number text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  instagram_handle text,
  phone text not null,
  contact_type text not null check (contact_type in ('cliente', 'lead')),
  attempt_stage smallint check (
    (contact_type = 'lead' and attempt_stage between 2 and 6)
    or (contact_type = 'cliente' and attempt_stage is null)
  ),
  next_contact_date date not null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_owner_id_idx on public.contacts (owner_id);
create index contacts_due_idx on public.contacts (next_contact_date, status);

create table public.message_templates (
  stage smallint primary key check (stage between 2 and 6),
  body text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.message_templates (stage, body) values
  (2, ''), (3, ''), (4, ''), (5, ''), (6, '');

create table public.reminder_dispatches (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_for date not null,
  sent_at timestamptz,
  zapi_message_id text,
  replied_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'replied', 'failed')),
  created_at timestamptz not null default now()
);

create index reminder_dispatches_contact_id_idx on public.reminder_dispatches (contact_id);
create index reminder_dispatches_zapi_message_id_idx on public.reminder_dispatches (zapi_message_id);
create unique index reminder_dispatches_contact_scheduled_idx on public.reminder_dispatches (contact_id, scheduled_for);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- helper usado nas policies de RLS para checar papel sem recursao
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.message_templates enable row level security;
alter table public.reminder_dispatches enable row level security;

-- profiles: cada um ve o proprio perfil; admin ve todos
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- contacts: funcionario so acessa os proprios; admin acessa tudo
create policy contacts_owner_select on public.contacts
  for select using (owner_id = auth.uid() or public.is_admin());

create policy contacts_owner_insert on public.contacts
  for insert with check (owner_id = auth.uid());

create policy contacts_owner_update on public.contacts
  for update using (owner_id = auth.uid() or public.is_admin());

create policy contacts_owner_delete on public.contacts
  for delete using (owner_id = auth.uid() or public.is_admin());

-- message_templates: qualquer usuario autenticado le; so admin edita
create policy message_templates_select on public.message_templates
  for select using (auth.role() = 'authenticated');

create policy message_templates_admin_write on public.message_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- reminder_dispatches: somente admin enxerga (funcionario nao ve status de resposta)
create policy reminder_dispatches_admin_only on public.reminder_dispatches
  for select using (public.is_admin());
