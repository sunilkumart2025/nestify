-- Enable the pg_cron extension (requires database restart if not enabled, usually enabled on Supabase)
-- Note: This extension might not be available on all tiers.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net to make HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job to run at 00:00 EVERY DAY
-- The Edge Function will check if any admins have a billing cycle scheduled for "today"
SELECT cron.schedule(
    'daily-billing-check', -- Job name
    '0 0 * * *',          -- Schedule (Midnight, every day)
    $$
    select
        net.http_post(
            url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-generate-monthly-bills',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule old monthly job if exists:
-- SELECT cron.unschedule('monthly-billing-job');
