-- Painel dos lembretes do Telegram (cards com Abrir WhatsApp / Ja chamei).
-- Uma funcao so leitura: a vendedora ve os dela, o admin ve de qualquer uma.
-- Nada aqui altera dados.

create or replace function public.portal_lembretes_telegram(p_profile uuid, p_dias int default 30, p_limite int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_func bigint;
  v_desde timestamptz := now() - make_interval(days => greatest(p_dias, 1));
  v_inicio_hoje timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
begin
  if auth.uid() is null or (p_profile <> auth.uid() and not public.is_admin()) then
    raise exception 'sem_permissao';
  end if;

  select id into v_func from wa_funcionarios where profile_id = p_profile limit 1;
  if v_func is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'no_telegram', (select telegram_chat_id is not null from wa_funcionarios where id = v_func),
      'na_fila', count(*) filter (where t.status = 'agendado'),
      'recebidos', count(*) filter (where t.status = 'enviado'),
      'recebidos_hoje', count(*) filter (where t.status = 'enviado' and t.enviado_em >= v_inicio_hoje),
      'abertos', count(*) filter (where t.aberto_em is not null),
      'chamados', count(*) filter (where t.resultado = 'chamei'),
      'chamados_hoje', count(*) filter (where t.resultado = 'chamei' and t.confirmado_em >= v_inicio_hoje),
      'nao_conseguiu', count(*) filter (where t.resultado = 'nao_consegui'),
      'sem_resposta', count(*) filter (where t.status = 'enviado' and t.confirmado_em is null),
      'lista', coalesce((
        select jsonb_agg(l order by l.enviado_em desc nulls last)
        from (
          select t2.id, t2.cliente_nome, t2.cliente_telefone, t2.contato_data, t2.status,
                 t2.enviado_em, t2.aberto_em, t2.cliques, t2.confirmado_em, t2.resultado
          from telegram_lembretes t2
          where t2.funcionario_id = v_func
            and t2.criado_em >= v_desde
            and t2.texto_original = 'portal'
          order by t2.enviado_em desc nulls last, t2.id desc
          limit least(greatest(p_limite, 1), 200)
        ) l
      ), '[]'::jsonb)
    )
    from telegram_lembretes t
    where t.funcionario_id = v_func
      and t.criado_em >= v_desde
      and t.texto_original = 'portal'
  );
end;
$$;

revoke execute on function public.portal_lembretes_telegram(uuid, int, int) from anon, public;
grant execute on function public.portal_lembretes_telegram(uuid, int, int) to authenticated;
