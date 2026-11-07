-- Agendador do disparo de lembretes.
--
-- POR QUE NAO O CRON DA VERCEL: a conta e' Hobby, que limita cron a UMA
-- execucao por dia, com precisao de ±59 min. Expressao mais frequente falha no
-- deploy. O disparo precisa de um tick de poucos em poucos minutos pra
-- espalhar as mensagens pela manha (ver NOTA SOBRE ESPACAMENTO na rota).
--
-- POR QUE NAO O GITHUB ACTIONS: o workflow pedia "*/5 9-14 * * *" (72
-- execucoes por dia) e o Actions entregava 1 ou 2, nas horas 13-18 UTC —
-- quase sempre FORA da janela de envio, entao a rota respondia "fora da
-- janela" e nao mandava nada. Era a razao de so existirem 59 disparos em seis
-- semanas contra 515 contatos vencidos. O cron do Actions e' best-effort.
--
-- PRE-REQUISITO MANUAL, UMA VEZ:
--   O segredo tem que estar no Vault com o nome 'cron_secret' e ser IGUAL a
--   env var CRON_SECRET da Vercel. Essa env var e' do tipo "sensitive" na
--   Vercel (gravacao-so: ninguem consegue ler depois, nem pelo dashboard),
--   entao o caminho e' definir um valor NOVO nos dois lugares:
--     1. Vercel: substituir CRON_SECRET e fazer redeploy de producao
--     2. Aqui:   select vault.create_secret('<valor novo>', 'cron_secret');
--   Sem isso o job roda, acha o Vault vazio, loga warning e nao chama nada
--   (de proposito: melhor nao disparar do que disparar sem autenticacao).

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create extension if not exists pg_net;

create or replace function public.trigger_dispatch_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if v_secret is null or v_secret = '' then
    raise warning 'cron_secret ausente no Vault: disparo de lembretes nao chamado';
    return;
  end if;

  -- timeout alto de proposito: a rota leva ate ~50s quando tem lote pra
  -- mandar (ver maxDuration em src/app/api/cron/dispatch-reminders/route.ts).
  -- Com o default de 2s do pg_net a requisicao seria cancelada no meio do
  -- envio.
  perform net.http_get(
    url := 'https://portalwecare.com.br/api/cron/dispatch-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;

-- security definer lendo o Vault: ninguem alem do dono precisa executar isso.
revoke all on function public.trigger_dispatch_reminders() from public;
revoke all on function public.trigger_dispatch_reminders() from anon;
revoke all on function public.trigger_dispatch_reminders() from authenticated;

-- */5 nas horas 9-13 UTC = 06:00-10:55 de Brasilia, inteiramente dentro da
-- janela que a rota exige (06:00-11:00). pg_cron usa UTC, e o Brasil nao tem
-- mais horario de verao desde 2019, entao UTC-3 vale o ano todo.
--
-- Acompanhar as execucoes:
--   select * from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'dispatch-reminders')
--   order by start_time desc limit 20;
-- E as respostas HTTP (ficam 6h):
--   select status_code, content, error_msg, created from net._http_response
--   order by created desc limit 20;
select cron.schedule(
  'dispatch-reminders',
  '*/5 9-13 * * *',
  $$select public.trigger_dispatch_reminders()$$
);
