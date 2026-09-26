-- Ensure pg_cron and pg_net extensions are active
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule existing job if re-running
select cron.unschedule('send-pick-reminders-job')
where exists (
  select 1 from cron.job where jobname = 'send-pick-reminders-job'
);

-- Schedule to run every 30 minutes
select cron.schedule(
  'send-pick-reminders-job',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://cwebvgnuicfmybjubtwx.supabase.co/functions/v1/send-pick-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
