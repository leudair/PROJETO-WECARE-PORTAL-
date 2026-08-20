-- Valor da ultima compra do cliente, pra o funcionario saber o contexto
-- (e tentar vender um pacote acima) na hora do lembrete.

alter table public.contacts
  add column last_purchase_value numeric(10, 2) check (last_purchase_value >= 0);
