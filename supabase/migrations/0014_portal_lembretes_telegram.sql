-- Lembretes de contato do Portal passam a chegar pelo Telegram da vendedora.
-- O disparo antigo pelo WhatsApp (reminder_dispatches, instancia Z-API
-- bloqueada) estava falhando desde 08/11.
--
-- Como funciona:
-- - De hora em hora (9h as 18h, segunda a sabado, Brasilia) a funcao abaixo
--   pega TODOS os clientes vencidos (contacts pendentes, next_contact_date <=
--   hoje) de cada vendedora que ja se cadastrou no bot e coloca na fila
--   telegram_lembretes como 'agendado'. Quem se cadastrar no meio do dia
--   recebe na hora seguinte.
-- - O job telegram-lembretes-disparo manda cada um como card com botoes:
--   "Abrir WhatsApp" (o clique fica registrado em aberto_em), "Ja chamei" e
--   "Nao consegui" (gravados em confirmado_em/resultado pelo telegram-webhook).
-- - O mesmo cliente so volta para a fila quando a data de contato dele mudar.
-- Nada e apagado; reminder_dispatches fica como esta.

alter table public.telegram_lembretes
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists contato_data date,
  add column if not exists aberto_em timestamptz,
  add column if not exists cliques int not null default 0,
  add column if not exists confirmado_em timestamptz,
  add column if not exists resultado text check (resultado in ('chamei', 'nao_consegui'));

create index if not exists telegram_lembretes_contact_idx
  on public.telegram_lembretes (contact_id, contato_data);

create or replace function public.portal_enfileirar_lembretes_telegram()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd int;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into telegram_lembretes
    (funcionario_id, contact_id, contato_data, cliente_nome, cliente_telefone, dias, texto_original, status, disparar_em)
  select x.funcionario_id, x.id, x.next_contact_date, x.name, x.tel, 1, 'portal', 'agendado', now()
  from (
    -- O mesmo telefone cadastrado duas vezes para a mesma vendedora vira um card so.
    select distinct on (c.owner_id, regexp_replace(c.phone, '\D', '', 'g'))
           f.id as funcionario_id, c.id, c.next_contact_date, c.name, c.created_at,
           regexp_replace(c.phone, '\D', '', 'g') as tel
    from contacts c
    join wa_funcionarios f on f.profile_id = c.owner_id and f.telegram_chat_id is not null
    join profiles p on p.id = c.owner_id and p.role = 'employee'
    where c.status = 'pending'
      and not coalesce(c.converted, false)
      and c.next_contact_date <= v_hoje
      and length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 10
      and not exists (
        select 1 from telegram_lembretes t
        where t.contact_id = c.id
          and t.contato_data = c.next_contact_date
      )
    order by c.owner_id, regexp_replace(c.phone, '\D', '', 'g'), c.next_contact_date
  ) x
  where not exists (
    select 1 from telegram_lembretes t
    where t.funcionario_id = x.funcionario_id
      and t.cliente_telefone = x.tel
      and t.criado_em > now() - interval '20 hours'
  )
  order by x.next_contact_date, x.created_at;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke execute on function public.portal_enfileirar_lembretes_telegram() from anon, authenticated, public;

select cron.schedule(
  'portal-lembretes-telegram',
  '0 12-21 * * 1-6',
  $$select public.portal_enfileirar_lembretes_telegram()$$
);
