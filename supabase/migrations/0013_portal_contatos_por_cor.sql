-- Contatos por cor na ficha da vendedora, a partir da classificacao ja feita
-- (wa_classificacao, hoje so do numero 47 99219-0251):
--   verde   = cliente fiel (2 ou mais compras)
--   azul    = comprou uma vez e sumiu
--   amarelo = lead engajado (conversou, nao comprou)
--   cinza   = respondeu e sumiu
-- A coluna vendedora vem escrita a mao (com e sem acento, apelidos), entao a
-- comparacao ignora acento e maiuscula. Nada aqui altera dados.

create or replace function public.portal_sem_acento(t text)
returns text
language sql
immutable
as $$
  select translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
$$;

create or replace function public.portal_cor_contato(p_qtd_compras int, p_comprou boolean, p_engajado boolean)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_qtd_compras, 0) >= 2 then 'verde'
    when coalesce(p_comprou, false) then 'azul'
    when coalesce(p_engajado, false) then 'amarelo'
    else 'cinza'
  end;
$$;

-- Nomes que a vendedora usa nas conversas (nome do cadastro + apelidos conhecidos).
create or replace function public.portal_nomes_vendedora(p_profile uuid)
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select array_remove(array[
    public.portal_sem_acento(f.nome),
    case when public.portal_sem_acento(f.nome) = 'eduarda' then 'duda' end
  ], null)
  from public.wa_funcionarios f
  where f.profile_id = p_profile
  limit 1;
$$;
revoke execute on function public.portal_nomes_vendedora(uuid) from anon, authenticated, public;

create or replace function public.portal_contatos_por_cor(p_profile uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_nomes text[];
begin
  if auth.uid() is null or (p_profile <> auth.uid() and not public.is_admin()) then
    raise exception 'sem_permissao';
  end if;
  v_nomes := coalesce(public.portal_nomes_vendedora(p_profile), '{}');

  return (
    select jsonb_build_object(
      'verde', count(*) filter (where cor = 'verde'),
      'azul', count(*) filter (where cor = 'azul'),
      'amarelo', count(*) filter (where cor = 'amarelo'),
      'cinza', count(*) filter (where cor = 'cinza')
    )
    from (
      select public.portal_cor_contato(c.qtd_compras, c.comprou, c.lead_engajado) as cor
      from public.wa_classificacao c
      where public.portal_sem_acento(c.vendedora) = any (v_nomes)
    ) x
  );
end;
$$;

create or replace function public.portal_lista_contatos_cor(p_profile uuid, p_cor text, p_limite int default 50)
returns table (
  telefone text,
  nome text,
  cor text,
  qtd_compras int,
  valor_estimado numeric,
  data_compra text,
  ultima_msg_cliente text,
  motivo text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_nomes text[];
begin
  if auth.uid() is null or (p_profile <> auth.uid() and not public.is_admin()) then
    raise exception 'sem_permissao';
  end if;
  v_nomes := coalesce(public.portal_nomes_vendedora(p_profile), '{}');

  return query
    select c.telefone::text,
           c.nome_real::text,
           public.portal_cor_contato(c.qtd_compras, c.comprou, c.lead_engajado),
           c.qtd_compras::int,
           c.valor_estimado::numeric,
           c.data_compra::text,
           c.ultima_msg_cliente::text,
           c.motivo::text
    from public.wa_classificacao c
    where public.portal_sem_acento(c.vendedora) = any (v_nomes)
      and public.portal_cor_contato(c.qtd_compras, c.comprou, c.lead_engajado) = p_cor
    order by c.valor_estimado desc nulls last
    limit least(greatest(p_limite, 1), 200);
end;
$$;

revoke execute on function public.portal_contatos_por_cor(uuid) from anon;
revoke execute on function public.portal_lista_contatos_cor(uuid, text, int) from anon;
