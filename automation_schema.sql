-- Automation Engine for Notifications

-- 1. Auto Rent Reminders (3 Days Before Due)
-- This function should be called daily. It uses a "last_checked" mechanism to avoid spam.
create table if not exists public.system_jobs (
    job_name text primary key,
    last_run_at timestamptz
);

create or replace function auto_generate_rent_reminders()
returns void
language plpgsql
security definer
as $$
declare
    v_last_run timestamptz;
begin
    -- Check if ran today (basic debounce)
    select last_run_at into v_last_run from system_jobs where job_name = 'rent_reminders';
    
    if v_last_run is not null and v_last_run > now() - interval '20 hours' then
        return; -- Already ran today
    end if;

    -- Find Invoices Due in 3 Days (inclusive) for Active Tenures
    insert into notifications (user_id, title, message, type, link)
    select 
        i.tenure_id,
        'Rent Due Soon',
        'Your rent for ' || i.month || ' is due on ' || to_char(i.due_date, 'DD Mon YYYY') || '. Please pay to avoid penalties.',
        'warning',
        '/tenure/payments'
    from invoices i
    join tenures t on i.tenure_id = t.id
    where 
        i.status = 'pending' 
        and t.status = 'active'
        and i.due_date = current_date + 3
        -- Avoid dupes for this invoice
        and not exists (
            select 1 from notifications n 
            where n.user_id = i.tenure_id 
            and n.title = 'Rent Due Soon' 
            and n.created_at > now() - interval '5 days' -- Cooldown
        );

    -- Log Execution
    insert into system_jobs (job_name, last_run_at)
    values ('rent_reminders', now())
    on conflict (job_name) do update set last_run_at = now();

end;
$$;


-- 2. Overdue Alerts (1 Day After Due)
create or replace function auto_generate_overdue_alerts()
returns void
language plpgsql
security definer
as $$
declare
    v_last_run timestamptz;
begin
    -- Check debounce
    select last_run_at into v_last_run from system_jobs where job_name = 'overdue_alerts';
    if v_last_run is not null and v_last_run > now() - interval '20 hours' then
        return; 
    end if;

    -- Find Overdue Invoices
    insert into notifications (user_id, title, message, type, link)
    select 
        i.tenure_id,
        'Payment Overdue',
        'Urgent: Your rent for ' || i.month || ' was due on ' || to_char(i.due_date, 'DD Mon YYYY') || '. Please pay immediately.',
        'error',
        '/tenure/payments'
    from invoices i
    join tenures t on i.tenure_id = t.id
    where 
        i.status = 'pending'
        and t.status = 'active'
        and i.due_date < current_date
        -- Only notify every 3 days for overdue items to avoid complete spam, or just once? Let's do every 3 days.
        and not exists (
            select 1 from notifications n 
            where n.user_id = i.tenure_id 
            and n.title = 'Payment Overdue' 
            and n.created_at > now() - interval '3 days'
        );

    -- Log Execution
    insert into system_jobs (job_name, last_run_at)
    values ('overdue_alerts', now())
    on conflict (job_name) do update set last_run_at = now();
end;
$$;

-- 3. Auto Settlement Report (Daily Summary for Admin)
create or replace function auto_generate_settlement_report()
returns void
language plpgsql
security definer
as $$
declare
    v_last_run timestamptz;
    v_total_collected decimal;
    v_txn_count integer;
    v_report_date date := current_date - 1; -- Report for yesterday
    v_admin_id uuid;
begin
    -- Check debounce
    select last_run_at into v_last_run from system_jobs where job_name = 'settlement_report';
    if v_last_run is not null and v_last_run > now() - interval '20 hours' then
        return; 
    end if;

    -- Iterate over all admins (or just current context if we assume single tenant but schema supports multiple)
    -- Ideally, this should loop through all admins. For MVP, we likely are triggering this largely for the logged-in admin.
    -- However, since this is a "system job", it should probably work for all admins.
    
    for v_admin_id in select id from admins loop
        
        -- Calculate Stats for Yesterday
        select 
            coalesce(sum(order_amount), 0), 
            count(*)
        into v_total_collected, v_txn_count
        from payments
        where 
            admin_id = v_admin_id 
            and payment_status = 'SUCCESS'
            and payment_time::date = v_report_date;

        -- Create Notification if there was activity
        if v_txn_count > 0 then
            insert into notifications (user_id, title, message, type, link)
            values (
                v_admin_id, 
                'Daily Settlement Report', 
                'Yesterday (' || to_char(v_report_date, 'DD Mon') || ') you collected ₹' || v_total_collected || ' across ' || v_txn_count || ' transactions.',
                'success', 
                '/admin/payments'
            );
        end if;
    end loop;

    -- Log Execution
    insert into system_jobs (job_name, last_run_at)
    values ('settlement_report', now())
    on conflict (job_name) do update set last_run_at = now();
end;
$$;

-- 4. Master Automation Trigger (Lazy Cron)
-- Call this from the Admin Dashboard `useEffect`
create or replace function run_daily_automations()
returns void
language plpgsql
security definer
as $$
begin
    perform auto_generate_rent_reminders();
    perform auto_generate_overdue_alerts();
    perform auto_generate_settlement_report(); -- Added
end;
$$;
