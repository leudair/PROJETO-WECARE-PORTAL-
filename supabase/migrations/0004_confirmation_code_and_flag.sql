-- Codigo de confirmacao individual por disparo (o funcionario responde com
-- ele, ou com a palavra "TUDO" para confirmar todos os pendentes do dia de
-- uma vez), e um flag calculado quando a confirmacao chega rapido demais
-- pra ser plausivel (menos de N segundos por contato confirmado).

alter table public.reminder_dispatches
  add column confirmation_code text,
  add column flagged_suspicious boolean not null default false;

create unique index reminder_dispatches_confirmation_code_idx
  on public.reminder_dispatches (confirmation_code)
  where confirmation_code is not null;
