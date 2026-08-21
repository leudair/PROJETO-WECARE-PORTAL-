-- Rastreio de "dinheiro na mesa": todo lead carrega um valor de interesse
-- (R$50 padrao se o funcionario nao informar um valor especifico manifestado
-- pelo lead). Enquanto nao converte, esse valor conta como oportunidade
-- perdida na Visao Geral. Quando o funcionario marca como convertido, o
-- valor sai da soma de "na mesa" (virou faturamento de verdade).

alter table public.contacts
  add column lead_interest_value numeric(10, 2) check (lead_interest_value >= 0),
  add column converted boolean not null default false,
  add column converted_at timestamptz;
