-- Etapa 1 do painel da empresa:
--   1) liga o cadastro do robo (wa_funcionarios) ao cadastro do Portal (profiles)
--   2) codigo de assinatura por pessoa (guardado embaralhado, trava apos 5 erros)
--   3) abrir o dia (caixa) e fechar o dia com relatorio assinado
--   4) gerente confere e assina o relatorio de cada vendedora
--   5) registro de quando o admin usa "Ver como"
--   6) resumo por vendedora (Portal + site + Telegram) num lugar so
-- Nada aqui apaga ou altera dados existentes.

create extension if not exists pgcrypto with schema extensions;

-- Dia de trabalho sempre no fuso de Sao Paulo.
create or replace function public.portal_hoje()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ---------------------------------------------------------------------------
-- 1) Ligacao robo <-> Portal
-- ---------------------------------------------------------------------------
alter table public.wa_funcionarios
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

-- Liga pelo codigo W: no Portal o nome comeca com "W2 - ...", no robo codigo = 'W2'.
update public.wa_funcionarios f
set profile_id = p.id
from public.profiles p
where f.profile_id is null
  and f.codigo ~* '^W\d+$'
  and p.full_name ~* ('^' || f.codigo || '\M');

-- CEO: perfil admin com o mesmo telefone do codigo 01.
update public.wa_funcionarios f
set profile_id = p.id
from public.profiles p
where f.profile_id is null
  and f.codigo = '01'
  and p.role = 'admin'
  and regexp_replace(p.whatsapp_number, '\D', '', 'g') = f.telefone;

-- ---------------------------------------------------------------------------
-- 2) Codigo de assinatura
-- ---------------------------------------------------------------------------
create table if not exists public.portal_codigos (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  codigo_hash text not null,
  erros_seguidos int not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);
-- Sem policies: ninguem le ou grava direto, so pelas funcoes abaixo.
alter table public.portal_codigos enable row level security;
revoke all on public.portal_codigos from anon, authenticated;

create or replace function public.portal_tem_codigo()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.portal_codigos where profile_id = auth.uid());
$$;

-- Cria ou troca o codigo. Para trocar, precisa do codigo atual.
-- Retorna 'ok' ou o motivo do erro. Erro de codigo NAO usa raise, para o
-- contador de tentativas nao ser desfeito junto com a transacao.
create or replace function public.portal_definir_codigo(p_novo text, p_atual text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'nao_logado';
  end if;
  if p_novo !~ '^\d{4,8}$' then
    return 'codigo_invalido';
  end if;

  select codigo_hash into v_hash from public.portal_codigos where profile_id = auth.uid();
  if v_hash is not null and not public.portal_conferir_codigo(p_atual) then
    return 'codigo_errado';
  end if;

  insert into public.portal_codigos (profile_id, codigo_hash)
  values (auth.uid(), extensions.crypt(p_novo, extensions.gen_salt('bf')))
  on conflict (profile_id) do update
    set codigo_hash = excluded.codigo_hash,
        erros_seguidos = 0,
        bloqueado_ate = null,
        atualizado_em = now();
  return 'ok';
end;
$$;

-- Confere o codigo de quem esta logado. 5 erros seguidos travam por 15 minutos.
create or replace function public.portal_conferir_codigo(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.portal_codigos%rowtype;
begin
  select * into r from public.portal_codigos where profile_id = auth.uid() for update;
  if not found then
    raise exception 'sem_codigo';
  end if;
  if r.bloqueado_ate is not null and r.bloqueado_ate > now() then
    raise exception 'codigo_bloqueado';
  end if;

  if p_codigo is not null and extensions.crypt(p_codigo, r.codigo_hash) = r.codigo_hash then
    update public.portal_codigos set erros_seguidos = 0, bloqueado_ate = null where profile_id = auth.uid();
    return true;
  end if;

  update public.portal_codigos
  set erros_seguidos = r.erros_seguidos + 1,
      bloqueado_ate = case when r.erros_seguidos + 1 >= 5 then now() + interval '15 minutes' else null end
  where profile_id = auth.uid();
  return false;
end;
$$;
revoke execute on function public.portal_conferir_codigo(text) from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- 3) Expediente (abrir e fechar o caixa) e relatorio do dia
-- ---------------------------------------------------------------------------
create table if not exists public.portal_expediente (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dia date not null,
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  unique (profile_id, dia)
);
alter table public.portal_expediente enable row level security;
create policy portal_expediente_select on public.portal_expediente
  for select using (profile_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.portal_expediente from anon, authenticated;

create table if not exists public.portal_relatorio_dia (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dia date not null,
  resumo jsonb not null,
  observacao text,
  assinado_em timestamptz not null default now(),
  gerente_id uuid references public.profiles (id),
  gerente_assinado_em timestamptz,
  gerente_observacao text,
  unique (profile_id, dia)
);
alter table public.portal_relatorio_dia enable row level security;
create policy portal_relatorio_dia_select on public.portal_relatorio_dia
  for select using (profile_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.portal_relatorio_dia from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Registro do "Ver como"
-- ---------------------------------------------------------------------------
create table if not exists public.portal_acessos_admin (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  alvo_profile_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.portal_acessos_admin enable row level security;
create policy portal_acessos_admin_select on public.portal_acessos_admin
  for select using (public.is_admin());
revoke insert, update, delete on public.portal_acessos_admin from anon, authenticated;

create or replace function public.portal_registrar_ver_como(p_alvo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'sem_permissao';
  end if;
  insert into public.portal_acessos_admin (admin_id, alvo_profile_id) values (auth.uid(), p_alvo);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Resumo por vendedora num periodo
--    Portal: lembretes e vendas marcadas. Site: conversas e Pix pagos do link
--    dela. Telegram: lembretes que ela pediu ao bot.
-- ---------------------------------------------------------------------------
create or replace function public.portal_resumo_vendedora(p_profile uuid, p_de date, p_ate date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_func public.wa_funcionarios%rowtype;
  v_slugs text[] := '{}';
  v jsonb;
begin
  if auth.uid() is null or (p_profile <> auth.uid() and not public.is_admin()) then
    raise exception 'sem_permissao';
  end if;

  select * into v_func from public.wa_funcionarios where profile_id = p_profile limit 1;
  if found then
    -- Links do site: /w2 e tambem o nome (ex.: /claudia). A raiz do CEO grava 'leudair'.
    v_slugs := array_remove(array[lower(v_func.codigo), lower(v_func.nome)], null);
  end if;

  select jsonb_build_object(
    'de', p_de,
    'ate', p_ate,
    'lembretes_cadastrados', (
      select count(*) from public.contacts c
      where c.owner_id = p_profile
        and (c.created_at at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'vendas_portal_qtd', (
      select count(*) from public.contacts c
      where c.owner_id = p_profile and c.converted
        and (c.converted_at at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'vendas_portal_valor', (
      select coalesce(sum(c.last_purchase_value), 0) from public.contacts c
      where c.owner_id = p_profile and c.converted
        and (c.converted_at at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'disparos_enviados', (
      select count(*) from public.reminder_dispatches d
      where d.employee_id = p_profile and d.status in ('sent', 'replied')
        and (d.sent_at at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'disparos_respondidos', (
      select count(*) from public.reminder_dispatches d
      where d.employee_id = p_profile and d.status = 'replied'
        and (d.sent_at at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'disparos_falhados', (
      select count(*) from public.reminder_dispatches d
      where d.employee_id = p_profile and d.status = 'failed'
        and d.scheduled_for between p_de and p_ate),
    'site_conversas', (
      select count(*) from public.site_conversas s
      where lower(s.vendedora_id) = any (v_slugs)
        and (s.criado_em at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'site_vendas_qtd', (
      select count(*) from public.site_pedidos p
      join public.site_conversas s on s.id = p.conversa_id
      where lower(s.vendedora_id) = any (v_slugs) and p.status = 'pago' and not p.teste
        and (p.pago_em at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'site_vendas_valor', (
      select coalesce(sum(coalesce(p.valor_pago, p.valor)), 0) from public.site_pedidos p
      join public.site_conversas s on s.id = p.conversa_id
      where lower(s.vendedora_id) = any (v_slugs) and p.status = 'pago' and not p.teste
        and (p.pago_em at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'site_cancelados', (
      select count(*) from public.site_pedidos p
      join public.site_conversas s on s.id = p.conversa_id
      where lower(s.vendedora_id) = any (v_slugs) and p.status in ('cancelado', 'expirado') and not p.teste
        and (p.criado_em at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'followups_programados', (
      select count(*) from public.telegram_lembretes t
      where t.funcionario_id = v_func.id
        and (t.criado_em at time zone 'America/Sao_Paulo')::date between p_de and p_ate),
    'followups_pendentes', (
      select count(*) from public.telegram_lembretes t
      where t.funcionario_id = v_func.id and t.enviado_em is null),
    'codigo_w', v_func.codigo
  ) into v;

  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Abrir e fechar o dia, 4) assinatura da gerente
-- ---------------------------------------------------------------------------
create or replace function public.portal_abrir_dia(p_codigo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.portal_conferir_codigo(p_codigo) then
    return 'codigo_errado';
  end if;
  insert into public.portal_expediente (profile_id, dia)
  values (auth.uid(), public.portal_hoje())
  on conflict (profile_id, dia) do nothing;
  return 'ok';
end;
$$;

create or replace function public.portal_fechar_dia(p_codigo text, p_observacao text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := public.portal_hoje();
begin
  if not exists (select 1 from public.portal_expediente where profile_id = auth.uid() and dia = v_hoje) then
    return 'dia_nao_aberto';
  end if;
  if exists (select 1 from public.portal_relatorio_dia where profile_id = auth.uid() and dia = v_hoje) then
    return 'dia_ja_fechado';
  end if;
  if not public.portal_conferir_codigo(p_codigo) then
    return 'codigo_errado';
  end if;

  insert into public.portal_relatorio_dia (profile_id, dia, resumo, observacao)
  values (auth.uid(), v_hoje, public.portal_resumo_vendedora(auth.uid(), v_hoje, v_hoje), nullif(trim(p_observacao), ''));

  update public.portal_expediente set fechado_em = now()
  where profile_id = auth.uid() and dia = v_hoje;
  return 'ok';
end;
$$;

create or replace function public.portal_gerente_assinar(p_relatorio bigint, p_codigo text, p_observacao text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'sem_permissao';
  end if;
  if not public.portal_conferir_codigo(p_codigo) then
    return 'codigo_errado';
  end if;
  update public.portal_relatorio_dia
  set gerente_id = auth.uid(),
      gerente_assinado_em = now(),
      gerente_observacao = nullif(trim(p_observacao), '')
  where id = p_relatorio and gerente_assinado_em is null;
  if not found then
    return 'relatorio_ja_assinado';
  end if;
  return 'ok';
end;
$$;

revoke execute on function public.portal_definir_codigo(text, text) from anon;
revoke execute on function public.portal_abrir_dia(text) from anon;
revoke execute on function public.portal_fechar_dia(text, text) from anon;
revoke execute on function public.portal_gerente_assinar(bigint, text, text) from anon;
revoke execute on function public.portal_resumo_vendedora(uuid, date, date) from anon;
revoke execute on function public.portal_registrar_ver_como(uuid) from anon;
revoke execute on function public.portal_tem_codigo() from anon;
