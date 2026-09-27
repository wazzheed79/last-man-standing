-- Use a server-only Vault secret for the scheduled Edge Function call.
-- Add `lms_service_role_key` to Supabase Vault before reminder delivery is
-- expected; the function itself requires a verified service_role JWT.
do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'send-pick-reminders-job'
  ) then
    perform cron.unschedule('send-pick-reminders-job');
  end if;
end;
$$;

select cron.schedule(
  'send-pick-reminders-job',
  '*/30 * * * *',
  $command$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'lms_project_url') || '/functions/v1/send-pick-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'lms_anon_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lms_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $command$
);

