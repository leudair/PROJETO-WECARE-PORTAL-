-- Meta mensal por funcionaria ("estipular a meta pra ela"): numero que o
-- admin define, comparado ao total que ela mesma marcou como vendida no mes
-- (contacts.last_purchase_value / converted) pro widget "Meta do mes" no
-- dashboard dela.
alter table public.profiles add column monthly_goal numeric(12, 2) check (monthly_goal >= 0);

-- Mesma logica de 0009_prevent_self_role_escalation.sql: profiles_update_own
-- deixa a funcionaria alterar qualquer coluna da propria linha, inclusive
-- essa. Sem isso ela poderia "bater a propria meta" so editando o numero
-- direto pelo client do Supabase. Estende o trigger existente em vez de criar
-- um novo, pra manter as duas checagens de auto-alteracao num lugar so.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.id and new.role is distinct from old.role then
    raise exception 'Nao e permitido alterar o proprio papel (role).'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  if auth.uid() = new.id and new.monthly_goal is distinct from old.monthly_goal then
    raise exception 'Nao e permitido alterar a propria meta mensal.'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  return new;
end;
$$;
