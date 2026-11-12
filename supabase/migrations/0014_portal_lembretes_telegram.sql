-- Lembretes de contato do Portal passam a chegar pelo Telegram da vendedora.
-- O disparo antigo pelo WhatsApp (reminder_dispatches) estava falhando.
--
-- Como funciona:
-- - De hora em hora (9h as 18h, segunda a sabado, horario de Brasilia) a funcao
--   abaixo olha cada vendedora que ja se cadastrou no bot (telegram_chat_id).
-- - Se ela ainda nao recebeu o lote de hoje, coloca ate 20 clientes vencidos
--   dela (contacts pendentes, next_contact_date <= hoje, mais antigos primeiro)
--   na fila telegram_lembretes com status 'agendado'.
-- - O job ja existente telegram-lembretes-disparo manda cada um como card
--   (nome, telefone, perfil, Instagram, ultima compra, estrategia, WhatsApp).
-- - O mesmo cliente nao volta para a fila antes de 7 dias.
-- - Quem se cadastrar no bot no meio do dia recebe o lote na hora seguinte.
-- Nada e apagado; reminder_dispatches fica como esta.

create or replace function public.portal_enfileirar_lembretes_telegram(p_limite int default 20)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  v_qtd int;
  r record;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inicio_dia timestamptz := (v_hoje::timestamp at time zone 'America/Sao_Paulo');
begin
  for r in
    select f.id as funcionario_id, f.profile_id
    from wa_funcionarios f
    join profiles p on p.id = f.profile_id and p.role = 'employee'
    where f.telegram_chat_id is not null
      and not exists (
        select 1 from telegram_lembretes t
        where t.funcionario_id = f.id
          and t.texto_original like 'portal:%'
          and t.criado_em >= v_inicio_dia
      )
  loop
    insert into telegram_lembretes (funcionario_id, cliente_nome, cliente_telefone, dias, texto_original, status, disparar_em)
    select r.funcionario_id,
           x.name,
           regexp_replace(x.phone, '\D', '', 'g'),
           1,
           'portal:' || x.id,
           'agendado',
           now()
    from (
      select c.id, c.name, c.phone
      from contacts c
      where c.owner_id = r.profile_id
        and c.status = 'pending'
        and not coalesce(c.converted, false)
        and c.next_contact_date <= v_hoje
        and coalesce(c.phone, '') <> ''
        and not exists (
          select 1 from telegram_lembretes t
          where t.texto_original = 'portal:' || c.id
            and t.criado_em > now() - interval '7 days'
        )
      order by c.next_contact_date, c.created_at
      limit greatest(p_limite, 1)
    ) x;
    get diagnostics v_qtd = row_count;
    v_total := v_total + v_qtd;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.portal_enfileirar_lembretes_telegram(int) from anon, authenticated, public;

select cron.schedule(
  'portal-lembretes-telegram',
  '0 12-21 * * 1-6',
  $$select public.portal_enfileirar_lembretes_telegram(20)$$
);
