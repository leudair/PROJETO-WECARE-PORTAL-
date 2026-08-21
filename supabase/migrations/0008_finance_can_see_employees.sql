-- O financeiro precisa ver a lista de funcionarios pra saber pra quem esta
-- lancando o faturamento (o dropdown do formulario). A policy de profiles so
-- liberava is_admin() (admin/manager) ou o proprio registro — financeiro
-- ficava sem ver ninguem. Adiciona mais uma policy permissiva (RLS soma com
-- OR) cobrindo quem tem acesso ao financeiro.

create policy profiles_finance_select on public.profiles
  for select using (public.can_view_finance());
