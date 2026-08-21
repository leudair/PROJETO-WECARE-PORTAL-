-- SEGURANCA CRITICA: a policy profiles_update_own (0001_init.sql) permite
-- que qualquer usuario autenticado atualize a PROPRIA linha em profiles sem
-- nenhuma restricao de coluna:
--
--   create policy profiles_update_own on public.profiles
--     for update using (id = auth.uid()) with check (id = auth.uid());
--
-- Isso inclui a coluna "role". Como role e' o unico campo que controla
-- acesso a admin/gerente/financeiro em toda a aplicacao (is_admin(),
-- can_view_finance(), requireAdmin(), requireFinance()...), qualquer
-- funcionario logado pode se autopromover a admin chamando diretamente o
-- client do Supabase (anon key + o proprio token de sessao, ambos ja
-- expostos ao navegador por design):
--
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', meuProprioId)
--
-- Essa chamada passa pela RLS (id = auth.uid() e' verdadeiro) e nao existe
-- nenhuma outra camada bloqueando. Este trigger fecha o buraco: bloqueia
-- qualquer alteracao da propria "role" feita pelo proprio usuario via sessao
-- autenticada (auth.uid() = id da linha sendo alterada), sem afetar as
-- atualizacoes feitas pelo painel admin (src/lib/data/admin.ts,
-- updateEmployee/createEmployee), que usam o client service_role — nesse
-- contexto auth.uid() e' NULL (nao ha JWT de usuario), entao a condicao do
-- trigger nunca bloqueia essas chamadas.
--
-- Reversivel: `drop trigger profiles_prevent_self_role_escalation on public.profiles;`
--             `drop function public.prevent_self_role_escalation();`

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
  return new;
end;
$$;

create trigger profiles_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();
