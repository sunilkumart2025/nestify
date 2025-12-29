-- Schedule the Late Fee Automation to run daily at 1:00 AM
-- This ensures it runs after the billing generation (which runs at midnight)

SELECT cron.schedule(
    'auto-apply-late-fees',           -- Job name
    '0 1 * * *',                      -- Schedule: 1:00 AM daily
    $$
    select
        net.http_post(
            url:='https://ynrgniwgkiwmzmhryrww.supabase.co/functions/v1/auto-apply-late-fees',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);
