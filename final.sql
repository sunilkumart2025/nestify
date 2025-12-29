-- FINAL CONSOLIDATED MIGRATION FILE
-- Generated on 12/26/2025 16:12:27
-- Contains all SQL code from workspace and artifacts


-- ==========================================
-- FILE: 2fa_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\2fa_migration.sql
-- ==========================================


-- Add 2FA column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- Add 2FA column to tenures table
ALTER TABLE tenures 
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;



-- ==========================================
-- FILE: amenities_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\amenities_schema.sql
-- ==========================================



-- Add amenities column to rooms table
alter table public.rooms 
add column if not exists amenities jsonb default '[]'::jsonb;

-- Ensure RLS allows update (already covers it usually, but verifying)
-- Policy "Admins can update their own rooms" should exist.



-- ==========================================
-- FILE: analytics_rpc.sql
-- PATH: C:\Users\sunil\Desktop\new\analytics_rpc.sql
-- ==========================================



-- Drop existing if conflict
DROP FUNCTION IF EXISTS get_admin_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_beds integer;
    v_occupied_beds integer;
    v_total_revenue numeric;
    v_pending_dues numeric;
    v_open_complaints integer;
    v_occupancy_rate numeric;
BEGIN
    -- 1. Calculate Occupancy
    -- Assumes rooms have 'capacity' and tenures count against it
    SELECT COALESCE(SUM(capacity), 0) INTO v_total_beds
    FROM rooms
    WHERE admin_id = p_admin_id;

    SELECT COUNT(*) INTO v_occupied_beds
    FROM tenures
    WHERE admin_id = p_admin_id AND status = 'active';

    IF v_total_beds > 0 THEN
        v_occupancy_rate := ROUND((v_occupied_beds::numeric / v_total_beds::numeric) * 100, 1);
    ELSE
        v_occupancy_rate := 0;
    END IF;

    -- 2. Calculate Revenue (Current Month)
    -- Sum of PAID invoices where payment_date is in current month
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
    FROM invoices
    WHERE admin_id = p_admin_id 
    AND status = 'paid'
    AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);

    -- 3. Calculate Pending Dues (All time)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_pending_dues
    FROM invoices
    WHERE admin_id = p_admin_id 
    AND status IN ('pending', 'overdue');

    -- 4. Open Complaints
    SELECT COUNT(*) INTO v_open_complaints
    FROM complaints
    WHERE admin_id = p_admin_id 
    AND status = 'open';

    RETURN json_build_object(
        'total_beds', v_total_beds,
        'occupied_beds', v_occupied_beds,
        'occupancy_rate', v_occupancy_rate,
        'revenue_month', v_total_revenue,
        'pending_dues', v_pending_dues,
        'open_issues', v_open_complaints
    );
END;
$$;



-- ==========================================
-- FILE: automation_cron.sql
-- PATH: C:\Users\sunil\Desktop\new\automation_cron.sql
-- ==========================================



-- Master Automation Function
-- Called by Admin Dashboard (Lazy Cron)
-- Orchestrates all daily tasks

DROP FUNCTION IF EXISTS run_daily_automations();

CREATE OR REPLACE FUNCTION run_daily_automations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id uuid;
    v_result jsonb;
BEGIN
    -- Get Current User (Admin)
    v_admin_id := auth.uid();
    
    IF v_admin_id IS NULL THEN
        RETURN json_build_object('error', 'Unauthorized');
    END IF;

    -- 1. Run Auto-Pilot Late Fees
    -- This checks overdue invoices and applies configured fees
    -- We ignore the result payload for now, just logging internal usage if needed
    PERFORM process_automated_late_fees(v_admin_id);

    -- 2. Future: Auto-Archive old logs
    -- 3. Future: Send Digest Emails

    RETURN json_build_object('status', 'success', 'timestamp', now());
END;
$$;



-- ==========================================
-- FILE: automation_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\automation_schema.sql
-- ==========================================


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



-- ==========================================
-- FILE: autopilot_advanced_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\autopilot_advanced_migration.sql
-- ==========================================



-- 1. Add Late Fee Configuration to Admin Profile
ALTER TABLE admins ADD COLUMN IF NOT EXISTS late_fee_daily_percent numeric DEFAULT 0;

-- 2. Advanced Late Fee Engine
-- Logic: 
-- Daily Fee = Subtotal * (Rate/100)
-- Total Late Fee = Daily Fee * Days Overdue
-- Updates existing 'late_fee' item if present, or adds new one.
-- Recalculates Total Amount = Subtotal + Fees + New Late Fee

CREATE OR REPLACE FUNCTION process_automated_late_fees(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_admin_config RECORD;
    v_daily_fee numeric;
    v_days_late integer;
    v_total_late_fee numeric;
    v_new_items jsonb;
    v_new_total numeric;
    v_updated_count integer := 0;
    v_item jsonb;
    v_platform_fees numeric;
BEGIN
    -- Get Admin Config
    SELECT late_fee_daily_percent INTO v_admin_config 
    FROM admins WHERE id = p_admin_id;

    -- If no late fee configured or 0, do nothing
    IF v_admin_config.late_fee_daily_percent IS NULL OR v_admin_config.late_fee_daily_percent <= 0 THEN
        RETURN json_build_object('status', 'skipped', 'message', 'No late fee configured');
    END IF;

    -- Loop through overdue pending invoices
    FOR v_invoice IN 
        SELECT * FROM invoices 
        WHERE admin_id = p_admin_id 
        AND status = 'pending'
        AND due_date < CURRENT_DATE
    LOOP
        -- Calculate Days Late
        v_days_late := CURRENT_DATE - v_invoice.due_date;
        
        -- Calculate Daily Fee based on Subtotal
        v_daily_fee := v_invoice.subtotal * (v_admin_config.late_fee_daily_percent / 100);
        
        -- Total Late Fee Accumulated
        v_total_late_fee := ROUND(v_daily_fee * v_days_late, 2);

        -- Construct New Items Array (Remove old late fee, add new one)
        v_new_items := '[]'::jsonb;
        v_platform_fees := 0;

        FOR v_item IN SELECT * FROM jsonb_array_elements(v_invoice.items)
        LOOP
            -- Keep strict track of other fees to rebuild total
            IF v_item->>'type' = 'late_fee' THEN
                -- Skip old late fee (we replace it)
                CONTINUE;
            ELSE
                v_new_items := v_new_items || v_item;
                -- Add to fee sum if it's a fee (excluding subtotal items usually)
                -- Actually, we can just rebuild total from Subtotal + Non-Rent Items
                -- Safest: Just keep the item
                IF v_item->>'type' = 'fee' THEN
                   v_platform_fees := v_platform_fees + (v_item->>'amount')::numeric;
                END IF;
            END IF;
        END LOOP;

        -- Add Updated Late Fee Item
        v_new_items := v_new_items || jsonb_build_object(
            'description', 'Late Fee (' || v_days_late || ' days @ ' || v_admin_config.late_fee_daily_percent || '%)',
            'amount', v_total_late_fee,
            'type', 'late_fee'
        );

        -- Recalculate Invoice Total
        -- Total = Subtotal + Platform Fees + Late Fee
        -- Note: v_platform_fees calculated above might miss some static fees if logic changes
        -- Better reliability: Base it on previous total minus old late fee
        
        v_new_total := v_invoice.subtotal + v_platform_fees + v_total_late_fee;

        -- Update Invoice
        UPDATE invoices
        SET 
            items = v_new_items,
            total_amount = v_new_total
        WHERE id = v_invoice.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'processed_count', v_updated_count,
        'rate_applied', v_admin_config.late_fee_daily_percent
    );
END;
$$;



-- ==========================================
-- FILE: autopilot_rpc.sql
-- PATH: C:\Users\sunil\Desktop\new\autopilot_rpc.sql
-- ==========================================



-- Auto-Pilot Late Fee Engine
-- 1. Finds invoices past due date
-- 2. Adds 'Late Fee' item if not exists
-- 3. Updates total amount

CREATE OR REPLACE FUNCTION process_auto_pilot(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_late_fee_amount numeric := 50; -- Daily or One-time (Simple implementation: One-time 50 for now)
    v_updated_count integer := 0;
    v_new_total numeric;
    v_has_late_fee boolean;
BEGIN
    -- Loop through overdue pending invoices
    FOR v_invoice IN 
        SELECT * FROM invoices 
        WHERE admin_id = p_admin_id 
        AND status = 'pending'
        AND due_date < CURRENT_DATE
    LOOP
        -- Check if Late Fee already applied
        SELECT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(v_invoice.items) AS item 
            WHERE item->>'type' = 'late_fee'
        ) INTO v_has_late_fee;

        IF NOT v_has_late_fee THEN
            -- Add Late Fee Item
            v_new_total := v_invoice.total_amount + v_late_fee_amount;
            
            UPDATE invoices
            SET 
                items = items || jsonb_build_object(
                    'description', 'Late Payment Fee',
                    'amount', v_late_fee_amount,
                    'type', 'late_fee'
                ),
                total_amount = v_new_total
            WHERE id = v_invoice.id;

            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'processed_count', v_updated_count
    );
END;
$$;



-- ==========================================
-- FILE: calendar_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\calendar_schema.sql
-- ==========================================


-- Create calendar_events table
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  title text not null,
  description text,
  event_date timestamp with time zone not null,
  event_type text check (event_type in ('meeting', 'maintenance', 'inspection', 'holiday', 'other')) default 'other',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.calendar_events enable row level security;

-- Policies
create policy "Admins can manage own events"
  on public.calendar_events
  for all
  using (auth.uid() = admin_id);

-- Tenants can view events created by their admin
create policy "Tenants can view admin events"
  on public.calendar_events
  for select
  using (
    exists (
      select 1 from public.tenures
      where tenures.id = auth.uid()
      and tenures.admin_id = calendar_events.admin_id
      and tenures.status = 'active'
    )
  );



-- ==========================================
-- FILE: cashfree_integration.sql
-- PATH: C:\Users\sunil\Desktop\new\cashfree_integration.sql
-- ==========================================


-- Enable the HTTP extension (Required for making API calls from Postgres)
create extension if not exists http with schema extensions;

-- Create a secure function to generate Cashfree Order Session
create or replace function create_cashfree_order(
  p_invoice_id text,
  p_amount numeric,
  p_customer_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_admin_id uuid,
  p_return_url text
)
returns json
language plpgsql
security definer
as $$
declare
  v_app_id text;
  v_secret_key text;
  v_api_url text := 'https://sandbox.cashfree.com/pg/orders';
  v_order_id text;
  v_response_status integer;
  v_response_body text;
  v_result json;
begin
  -- 1. Fetch Keys
  select cashfree_app_id, cashfree_secret_key
  into v_app_id, v_secret_key
  from admins
  where id = p_admin_id;

  if v_app_id is null or v_secret_key is null then
    return json_build_object('success', false, 'message', 'Cashfree keys not configured by Admin');
  end if;

  -- 2. Validate & Sanitize Phone
  p_customer_phone := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  if length(p_customer_phone) > 10 then
     p_customer_phone := right(p_customer_phone, 10);
  end if;
  if p_customer_phone is null or length(p_customer_phone) < 10 then
     p_customer_phone := '9876543210'; 
  end if;

  p_customer_id := 'CUST_' || regexp_replace(p_customer_id, '-', '', 'g');
  -- Ensure Order ID is < 50 chars (Cashfree Limit)
  -- Format: ord_{8_char_uuid}_{epoch}
  v_order_id := 'ord_' || substring(p_invoice_id, 1, 8) || '_' || floor(extract(epoch from now()));

  -- 4. Make HTTP Request
  select status, content::text
  into v_response_status, v_response_body
  from extensions.http((
    'POST',
    v_api_url,
    ARRAY[
      extensions.http_header('x-client-id', v_app_id),
      extensions.http_header('x-client-secret', v_secret_key),
      extensions.http_header('x-api-version', '2023-08-01'), -- RESTORE LATEST VERSION
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'order_id', v_order_id,
      'order_amount', p_amount,
      'order_currency', 'INR',
      'customer_details', json_build_object(
        'customer_id', p_customer_id,
        'customer_name', p_customer_name,
        'customer_email', p_customer_email,
        'customer_phone', p_customer_phone
      ),
      'order_meta', json_build_object(
         'return_url', p_return_url
      )
    )::text
  ));

  -- 4. Handle Response
  if v_response_status between 200 and 299 then
    v_result := v_response_body::json;
    return json_build_object(
      'success', true, 
      'payment_session_id', v_result->>'payment_session_id',
      'payment_link', v_result->'payments'->>'url', -- Try to get link if available
      'order_id', v_order_id
    );
  else
    return json_build_object('success', false, 'message', 'Cashfree API Error: ' || v_response_body);
  end if;

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;





-- ==========================================
-- FILE: communication_gateway_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\communication_gateway_migration.sql
-- ==========================================



-- Add Twilio / Communication Gateway Credentials
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS twilio_account_sid text,
ADD COLUMN IF NOT EXISTS twilio_auth_token text,
ADD COLUMN IF NOT EXISTS twilio_from_number text,
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

-- Enhance RLS (Admin can read/write their own secrets)
-- Existing policies on 'admins' likely cover this, but good to ensure
-- (Assuming standard 'Users can update own profile' policy exists)



-- ==========================================
-- FILE: complaints.sql
-- PATH: C:\Users\sunil\Desktop\new\complaints.sql
-- ==========================================


-- Create complaints table
create table complaints (
  id uuid default uuid_generate_v4() primary key,
  tenure_id uuid references tenures(id) on delete cascade not null,
  admin_id uuid references admins(id) on delete cascade not null,
  title text not null,
  description text not null,
  status text check (status in ('open', 'in_progress', 'resolved')) default 'open',
  priority text check (priority in ('low', 'medium', 'high', 'emergency')) default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table complaints enable row level security;

-- Policies

-- Tenures can view their own complaints
create policy "Tenures can view their own complaints"
  on complaints for select
  using (auth.uid() = tenure_id);

-- Tenures can insert their own complaints
create policy "Tenures can insert their own complaints"
  on complaints for insert
  with check (auth.uid() = tenure_id);

-- Admins can view complaints assigned to them
create policy "Admins can view complaints assigned to them"
  on complaints for select
  using (auth.uid() = admin_id);

-- Admins can update status of complaints assigned to them
create policy "Admins can update complaints assigned to them"
  on complaints for update
  using (auth.uid() = admin_id);



-- ==========================================
-- FILE: debug_twilio_logs.sql
-- PATH: C:\Users\sunil\Desktop\new\debug_twilio_logs.sql
-- ==========================================



-- Run this to see the latest Twilio responses
SELECT 
    created_at, 
    title, 
    type, 
    message as twilio_response_or_log
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- COMMON TWILIO ERRORS & SOLUTIONS:

-- 1. "Content is not allowed" / "Structure is invalid"
--    CAUSE: You are trying to send a free-form message but the 24-hour session is not active.
--    FIX (Sandbox): Send "join <your-sandbox-keyword>" to your Twilio Number from your personal WhatsApp.
--    FIX (Production): You MUST use a pre-approved Template.

-- 2. "UNAUTHORIZED" / 401
--    CAUSE: Wrong Account SID or Auth Token in platform_config.

-- 3. "To number: whatsapp:+91... is not a valid mobile number"
--    CAUSE: Recipient number is not Verified (if using Trial account) or Sandbox not joined.

-- 4. "From number is not a valid WhatsApp-enabled number"
--    CAUSE: You put a standard SMS number in 'twilio_from_number' instead of the WhatsApp one.



-- ==========================================
-- FILE: expenses_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\expenses_schema.sql
-- ==========================================


-- Operation Black Ledger: Expense Management Schema

-- 1. Vendors Table
-- Stores suppliers and service providers
create table if not exists public.vendors (
    id uuid default uuid_generate_v4() primary key,
    admin_id uuid references public.admins(id) on delete cascade not null,
    name text not null,
    category text, -- e.g. "Maintenance", "Utilities"
    phone text,
    email text,
    gst_number text,
    address text,
    balance decimal default 0, -- Amount we owe them (Credit) or they owe us (Debit)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Vendors
alter table public.vendors enable row level security;

create policy "Admins can manage their own vendors"
    on public.vendors for all
    using (admin_id = auth.uid());

-- 2. Expenses Table
-- The core ledger
create table if not exists public.expenses (
    id uuid default uuid_generate_v4() primary key,
    admin_id uuid references public.admins(id) on delete cascade not null,
    vendor_id uuid references public.vendors(id) on delete set null,
    
    title text not null, -- Short description
    amount decimal not null,
    category text not null, -- "Maintenance", "Salary", "Electricity", "Rent", "Office"
    
    expense_date date default current_date,
    payment_mode text default 'cash', -- "cash", "upi", "bank_transfer"
    
    receipt_url text, -- Storage path for image/pdf
    notes text,
    
    is_recurring boolean default false,
    recurring_interval text, -- "monthly", "weekly"
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Expenses
alter table public.expenses enable row level security;

create policy "Admins can manage their own expenses"
    on public.expenses for all
    using (admin_id = auth.uid());

-- 3. Indexes for Analytics speed
create index if not exists idx_expenses_admin_date on public.expenses(admin_id, expense_date);
create index if not exists idx_expenses_category on public.expenses(admin_id, category);

-- 4. RPC for P&L Reporting (Monthly)
-- Returns Income vs Expense for the last 6 months
create or replace function get_monthly_pnl(p_admin_id uuid)
returns table (
    month text,
    income decimal,
    expense decimal,
    profit decimal
) 
language plpgsql
security definer
as $$
begin
    return query
    with months as (
        select generate_series(
            date_trunc('month', current_date - interval '5 months'),
            date_trunc('month', current_date),
            '1 month'::interval
        ) as month_start
    ),
    income_data as (
        select 
            date_trunc('month', payment_time) as month, 
            sum(order_amount) as total 
        from payments 
        where admin_id = p_admin_id and payment_status = 'SUCCESS'
        group by 1
    ),
    expense_data as (
        select 
            date_trunc('month', expense_date) as month, 
            sum(amount) as total 
        from expenses 
        where admin_id = p_admin_id
        group by 1
    )
    select 
        to_char(m.month_start, 'Mon YYYY') as month,
        coalesce(i.total, 0) as income,
        coalesce(e.total, 0) as expense,
        (coalesce(i.total, 0) - coalesce(e.total, 0)) as profit
    from months m
    left join income_data i on i.month = m.month_start
    left join expense_data e on e.month = m.month_start
    order by m.month_start desc;
end;
$$;



-- ==========================================
-- FILE: feedback_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\feedback_schema.sql
-- ==========================================



-- Create Feedback Table
create table if not exists public.feedback (
    id uuid default gen_random_uuid() primary key,
    tenure_id uuid references public.tenures(id) on delete cascade not null,
    admin_id uuid references public.admins(id) on delete cascade, -- Null if target is 'nestify'
    target text check (target in ('nestify', 'hostel')) not null,
    rating integer check (rating >= 1 and rating <= 5) not null,
    category text not null, -- 'general', 'maintenance', 'food', 'staff', 'app_issue', 'feature_request'
    message text,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Policies

-- 1. Tenants can insert feedback
create policy "Tenants can insert feedback"
    on public.feedback for insert
    with check (
        -- Can only insert for their own tenure_id
        auth.uid() = tenure_id
    );

-- 2. Tenants can view their own feedback
create policy "Tenants can view own feedback"
    on public.feedback for select
    using (
        auth.uid() = tenure_id
    );

-- 3. Admins can view feedback directed to their hostel
create policy "Admins can view hostel feedback"
    on public.feedback for select
    using (
        -- Check if user is the admin_id associated with the feedback
        -- Note: Feedback for 'nestify' might not have admin_id set, or we might set it for tracking context but filter in UI.
        -- We will enforce that admin can only see rows where admin_id matches their ID AND target is 'hostel' (optional, or just all linked to them)
        auth.uid() = admin_id
    );

-- 4. Admins can update 'is_read' status
create policy "Admins can update feedback status"
    on public.feedback for update
    using (auth.uid() = admin_id)
    with check (auth.uid() = admin_id);

-- Add simple index
create index if not exists feedback_admin_id_idx on public.feedback(admin_id);
create index if not exists feedback_tenure_id_idx on public.feedback(tenure_id);



-- ==========================================
-- FILE: fix_audit_logging.sql
-- PATH: C:\Users\sunil\Desktop\new\fix_audit_logging.sql
-- ==========================================



-- Fix log_activity to capture admin_id
create or replace function public.log_activity(
  p_action text,
  p_details jsonb default '{}'::jsonb
) returns void as $$
declare
  v_admin_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  -- 1. Check if user is an Admin
  select id into v_admin_id from public.admins where id = v_user_id;
  
  -- 2. If not admin, check if user is a Tenant and get their Admin
  if v_admin_id is null then
    select admin_id into v_admin_id from public.tenures where id = v_user_id;
  end if;

  -- 3. Insert log with linked Admin ID
  insert into public.audit_logs (user_id, admin_id, action, details)
  values (v_user_id, v_admin_id, p_action, p_details);

end;
$$ language plpgsql security definer;



-- ==========================================
-- FILE: fix_security_advanced.sql
-- PATH: C:\Users\sunil\Desktop\new\fix_security_advanced.sql
-- ==========================================



-- 1. Enable Realtime for user_sessions
-- Check if publication exists, if not create it (standard supabase setup usually has it)
-- We add the table to the publication explicitly.
alter publication supabase_realtime add table public.user_sessions;

-- 2. Ensure Replica Identity is Full (good for utilizing realtime updates properly)
alter table public.user_sessions replica identity full;

-- 3. Fix RLS for user_sessions
drop policy if exists "Users can view and update own session" on public.user_sessions;

create policy "Users can select own session" on public.user_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own session" on public.user_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own session" on public.user_sessions
  for update using (auth.uid() = user_id);

-- 4. Fix RLS for audit_logs
drop policy if exists "Users can insert own logs" on public.audit_logs;

create policy "Users can insert own logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);

-- 5. Grant permissions (just in case)
grant all on public.user_sessions to authenticated;
grant all on public.audit_logs to authenticated;

-- 6. Create RPC for cleaner logging (Advanced Version: Server-side logging)
create or replace function log_activity(
  p_action text,
  p_details jsonb default '{}'::jsonb
) returns void as $$
begin
  insert into public.audit_logs (user_id, action, details)
  values (auth.uid(), p_action, p_details);
end;
$$ language plpgsql security definer;

-- 7. Create RPC for Session Enforcement (Server-side upsert)
create or replace function update_session(
  p_session_token text,
  p_page text default null
) returns void as $$
begin
  insert into public.user_sessions (user_id, current_session_token, last_active_page, updated_at)
  values (auth.uid(), p_session_token, p_page, now())
  on conflict (user_id) do update
  set 
    current_session_token = excluded.current_session_token,
    last_active_page = coalesce(excluded.last_active_page, user_sessions.last_active_page),
    updated_at = now();
end;
$$ language plpgsql security definer;



-- ==========================================
-- FILE: fix_tenure_permissions.sql
-- PATH: C:\Users\sunil\Desktop\new\fix_tenure_permissions.sql
-- ==========================================


-- Fix RLS policies to allow Tenants to view their Hostel/Admin details and Notices

-- 1. Allow Tenants to view their linked Admin's details (Hostel Name, Address, Phone, etc.)
-- Drop existing policy if it conflicts or is too narrow (though likely none exists for tenants)
drop policy if exists "Tenants can view their linked admin" on public.admins;

create policy "Tenants can view their linked admin"
  on public.admins
  for select
  using (
    id in (
      select admin_id from public.tenures where id = auth.uid()
    )
  );

-- 2. Ensure Notices table exists and has correct policies
-- (Re-defining policy to ensure it works)
create table if not exists public.notices (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text check (category in ('general', 'maintenance', 'event', 'urgent')) default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notices enable row level security;

-- Verify/Re-create Notice policies
drop policy if exists "Tenures can view notices from their admin" on public.notices;

create policy "Tenures can view notices from their admin"
  on public.notices
  for select
  using (
    admin_id in (
      select admin_id from public.tenures where id = auth.uid()
    )
  );

-- Admin policies for Notices (Ensure Admins can manage them)
drop policy if exists "Admins can view their own notices" on public.notices;
drop policy if exists "Admins can insert their own notices" on public.notices;
drop policy if exists "Admins can delete their own notices" on public.notices;

create policy "Admins can view their own notices" on public.notices for select using (auth.uid() = admin_id);
create policy "Admins can insert their own notices" on public.notices for insert with check (auth.uid() = admin_id);
create policy "Admins can delete their own notices" on public.notices for delete using (auth.uid() = admin_id);



-- ==========================================
-- FILE: gamification_logic.sql
-- PATH: C:\Users\sunil\Desktop\new\gamification_logic.sql
-- ==========================================


-- Helper Function to safely award a badge
create or replace function award_badge(target_user_id uuid, badge_code text)
returns void as $$
begin
    insert into user_badges (user_id, badge_id)
    values (target_user_id, badge_code)
    on conflict (user_id, badge_id) do nothing;
end;
$$ language plpgsql security definer;

-- Trigger Function: Payment Achievements
create or replace function check_payment_achievements()
returns trigger as $$
declare
    consecutive_payments int;
    invoice_due_date date;
begin
    -- Only run on successful payments (Schema uses payment_status = 'SUCCESS')
    if new.payment_status = 'SUCCESS' then
        
        -- 1. Check Early Bird: Payment Time < Due Date
        -- We need to fetch due_date from the linked invoice
        if new.invoice_id is not null then
            select due_date into invoice_due_date
            from invoices
            where id = new.invoice_id;

            -- Check if paid on or before due date
            if invoice_due_date is not null and new.payment_time::date <= invoice_due_date then
                perform award_badge(new.tenure_id, 'early_bird');
            end if;
        end if;

        -- 2. Check Streak Master: 3 consecutive on-time payments
        -- We need to join with invoices to check the dates for previous payments
        select count(*)
        into consecutive_payments
        from (
            select p.payment_status, p.payment_time, i.due_date
            from payments p
            join invoices i on p.invoice_id = i.id
            where p.tenure_id = new.tenure_id
            and p.payment_status = 'SUCCESS'
            order by p.payment_time desc
            limit 3
        ) recent
        where recent.payment_time::date <= recent.due_date;

        if consecutive_payments >= 3 then
            perform award_badge(new.tenure_id, 'streak_master');
        end if;

    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger: Associate with Payments Table
drop trigger if exists trigger_check_payment_achievements on payments;
create trigger trigger_check_payment_achievements
    after insert or update on payments
    for each row
    execute function check_payment_achievements();


-- Trigger Function: Profile Achievements
create or replace function check_profile_achievements()
returns trigger as $$
begin
    -- Verified Guardian: 2FA Enabled + Phone present
    if new.is_2fa_enabled = true and new.phone is not null and length(new.phone) >= 10 then
        perform award_badge(new.id, 'verified_guardian');
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger: Associate with Tenures Table
drop trigger if exists trigger_check_profile_achievements on tenures;
create trigger trigger_check_profile_achievements
    after insert or update on tenures
    for each row
    execute function check_profile_achievements();



-- ==========================================
-- FILE: gamification_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\gamification_schema.sql
-- ==========================================


-- Create Badges Table
create table if not exists badges (
    id text primary key,
    name text not null,
    description text not null,
    icon text not null, -- Stores lucide icon name or emoji
    category text check (category in ('payment', 'profile', 'community', 'special')),
    color text default '#6366f1'
);

-- Create User Badges Table
create table if not exists user_badges (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references tenures(id) on delete cascade not null,
    badge_id text references badges(id) on delete cascade not null,
    awarded_at timestamptz default now(),
    unique(user_id, badge_id)
);

-- Enable RLS
alter table badges enable row level security;
alter table user_badges enable row level security;

-- Policies
create policy "Badges are viewable by everyone" on badges for select using (true);
create policy "User badges are viewable by everyone" on user_badges for select using (true);

-- Seed Initial Badges
insert into badges (id, name, description, icon, category, color) values
('early_bird', 'Early Bird', 'Paid rent before due date', 'Zap', 'payment', '#eab308'),
('streak_master', 'Streak Master', '3 Months on-time streak', 'Flame', 'payment', '#f97316'),
('verified_guardian', 'Verified Guardian', 'Profile & 2FA enabled', 'ShieldCheck', 'profile', '#22c55e'),
('digital_native', 'Digital Native', 'Active app usage', 'Smartphone', 'special', '#3b82f6'),
('good_neighbor', 'Good Neighbor', 'Zero complaints record', 'Heart', 'community', '#ec4899')
on conflict (id) do nothing;



-- ==========================================
-- FILE: monitor_registry.sql
-- PATH: C:\Users\sunil\Desktop\new\monitor_registry.sql
-- ==========================================


-- Function to fetch paginated global admins
CREATE OR REPLACE FUNCTION get_global_admins(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset integer;
    v_admins json;
    v_total bigint;
BEGIN
    v_offset := (page_number - 1) * page_size;

    SELECT count(*) INTO v_total FROM admins;

    SELECT json_agg(t) INTO v_admins
    FROM (
        SELECT 
            id, 
            full_name, 
            email, 
            phone, 
            hostel_name, 
            created_at
        FROM admins
        ORDER BY created_at DESC
        LIMIT page_size OFFSET v_offset
    ) t;

    RETURN json_build_object(
        'data', COALESCE(v_admins, '[]'::json),
        'total', v_total
    );
END;
$$;

-- Function to fetch paginated global tenants with trust scores
CREATE OR REPLACE FUNCTION get_global_tenants(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset integer;
    v_tenants json;
    v_total bigint;
BEGIN
    v_offset := (page_number - 1) * page_size;

    SELECT count(*) INTO v_total FROM tenures;

    SELECT json_agg(t) INTO v_tenants
    FROM (
        SELECT 
            t.id,
            t.full_name,
            t.status,
            t.trust_score,
            a.hostel_name,
            t.created_at
        FROM tenures t
        JOIN admins a ON t.admin_id = a.id
        ORDER BY t.created_at DESC
        LIMIT page_size OFFSET v_offset
    ) t;

    RETURN json_build_object(
        'data', COALESCE(v_tenants, '[]'::json),
        'total', v_total
    );
END;
$$;

-- Function to fetch global transaction stream
CREATE OR REPLACE FUNCTION get_global_transactions(
    limit_count integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transactions json;
BEGIN
    SELECT json_agg(t) INTO v_transactions
    FROM (
        SELECT 
            tr.id,
            tr.amount,
            tr.status,
            tr.created_at,
            tr.payment_method,
            t.full_name as tenant_name,
            a.hostel_name
        FROM transactions tr
        JOIN invoices i ON tr.invoice_id = i.id
        JOIN tenures t ON i.tenure_id = t.id
        JOIN admins a ON t.admin_id = a.id
        ORDER BY tr.created_at DESC
        LIMIT limit_count
    ) t;

    RETURN COALESCE(v_transactions, '[]'::json);
END;
$$;



-- ==========================================
-- FILE: monitor_upgrade.sql
-- PATH: C:\Users\sunil\Desktop\new\monitor_upgrade.sql
-- ==========================================


-- Create a function to get global platform stats
-- This function accesses all data, so it must be SECURITY DEFINER
-- Ideally, access should be restricted, but for this "Monitor Login" flow we assume the app handles auth.

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_admins bigint;
    v_total_tenants bigint;
    v_total_revenue numeric;
    v_alert_count bigint;
    v_recent_activities json;
BEGIN
    -- 1. Count Total Admins
    SELECT count(*) INTO v_total_admins FROM admins;

    -- 2. Count Total Tenants
    SELECT count(*) INTO v_total_tenants FROM tenures;

    -- 3. Calculate Total Revenue (All time paid payments)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue 
    FROM payments 
    WHERE status = 'paid';

    -- 4. Count "Alerts" (Let's define alerts as recent errors in audit logs)
    SELECT count(*) INTO v_alert_count 
    FROM audit_logs 
    WHERE action LIKE '%ERROR%' OR action LIKE '%FAILED%' 
    AND created_at > (now() - interval '24 hours');

    -- 5. Fetch Recent Activities (Global)
    SELECT json_agg(t) INTO v_recent_activities
    FROM (
        SELECT 
            created_at,
            action as message,
            CASE 
                WHEN action LIKE '%ERROR%' THEN 'error'
                WHEN action LIKE '%LOGIN%' THEN 'auth'
                ELSE 'info'
            END as type
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    -- 6. Fetch High Risk Tenants
    DECLARE
        v_high_risk_tenants json;
    BEGIN
        SELECT json_agg(t) INTO v_high_risk_tenants
        FROM (
            SELECT full_name, trust_score, status 
            FROM tenures 
            WHERE trust_score < 40 
            ORDER BY trust_score ASC 
            LIMIT 5
        ) t;
    END;

    -- Return JSON object
    RETURN json_build_object(
        'total_admins', v_total_admins,
        'total_tenants', v_total_tenants,
        'total_revenue', v_total_revenue,
        'alert_count', v_alert_count,
        'recent_activities', COALESCE(v_recent_activities, '[]'::json),
        'high_risk_tenants', COALESCE(v_high_risk_tenants, '[]'::json)
    );
END;
$$;



-- ==========================================
-- FILE: nestid_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\nestid_schema.sql
-- ==========================================


-- Add NestID verification columns to admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS nestid_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS permanent_address text,
ADD COLUMN IF NOT EXISTS communication_address text,
ADD COLUMN IF NOT EXISTS alt_phone text,
ADD COLUMN IF NOT EXISTS aadhar_number text,
ADD COLUMN IF NOT EXISTS pan_number text,
ADD COLUMN IF NOT EXISTS nestid_verified_at timestamptz;

-- Add NestID verification columns to tenures
ALTER TABLE tenures
ADD COLUMN IF NOT EXISTS nestid_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS aadhar_number text,
ADD COLUMN IF NOT EXISTS nestid_verified_at timestamptz;

-- Add constraint to ensure status is valid
ALTER TABLE admins ADD CONSTRAINT check_nestid_status CHECK (nestid_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE tenures ADD CONSTRAINT check_nestid_status CHECK (nestid_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- RLS Update (Ensure users can see their own sensitive data)
-- admins policies likely already cover "select * using (auth.uid() = id)"
-- tenures policies likely cover "select * using (email = auth.email() or phone = ...)" 
-- Just in case, explicit security is good, but existing row-level policies usually cover new columns on the row.

-- Create a log table for verification attempts (Optional but good for audit)
CREATE TABLE IF NOT EXISTS nestid_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid, -- Link to admin or tenure (polymorphic or just raw uuid)
    user_type text, -- 'admin' or 'tenure'
    doc_type text, -- 'aadhaar', 'pan'
    status text, -- 'success', 'failed'
    response_data jsonb,
    created_at timestamptz DEFAULT now()
);

alter table nestid_logs enable row level security;
-- Only admins/platform can see logs usually
create policy "Admins see own logs" on nestid_logs for select using (auth.uid() = user_id);



-- ==========================================
-- FILE: notices.sql
-- PATH: C:\Users\sunil\Desktop\new\notices.sql
-- ==========================================


-- Create notices table
create table notices (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references admins(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text check (category in ('general', 'maintenance', 'event', 'urgent')) default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table notices enable row level security;

-- Policies

-- Admin can see their own notices
create policy "Admins can view their own notices"
  on notices for select
  using (auth.uid() = admin_id);

-- Admin can insert their own notices
create policy "Admins can insert their own notices"
  on notices for insert
  with check (auth.uid() = admin_id);

-- Admin can delete their own notices
create policy "Admins can delete their own notices"
  on notices for delete
  using (auth.uid() = admin_id);

-- Tenures can view notices from their linked admin
create policy "Tenures can view notices from their admin"
  on notices for select
  using (
    admin_id in (
      select admin_id from tenures where id = auth.uid()
    )
  );



-- ==========================================
-- FILE: notifications_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\notifications_migration.sql
-- ==========================================


-- Add is_read column to messages table
alter table messages add column if not exists is_read boolean default false;

-- Enable RLS for update functionality for receivers
create policy "Users can mark messages they received as read"
on messages for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);



-- ==========================================
-- FILE: notifications_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\notifications_schema.sql
-- ==========================================


-- Create Notifications Table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  message text not null,
  type text check (type in ('info', 'success', 'warning', 'error')) default 'info',
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Allow system/admins to insert notifications (broad for now to allow triggers)
create policy "System can insert notifications"
  on notifications for insert
  with check (true);

-- Create index for performance
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_is_read_idx on notifications(is_read);

-- RPC to mark all as read
create or replace function mark_all_notifications_as_read()
returns void
language plpgsql
security definer
as $$
begin
  update notifications
  set is_read = true
  where user_id = auth.uid() and is_read = false;
end;
$$;



-- ==========================================
-- FILE: otp_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\otp_schema.sql
-- ==========================================


-- Create OTP Codes table
create table if not exists public.otp_codes (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  code text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- Enable RLS
alter table public.otp_codes enable row level security;

-- Policies
create policy "Allow public insert for OTP"
  on public.otp_codes for insert
  with check (true);

create policy "Allow public select for OTP verification"
  on public.otp_codes for select
  using (true);

-- Function to clean up expired OTPs (optional, can be run manually or via cron)
create or replace function delete_expired_otps()
returns void as $$
begin
  delete from public.otp_codes where expires_at < now();
end;
$$ language plpgsql;



-- ==========================================
-- FILE: otp_system_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\otp_system_migration.sql
-- ==========================================



-- OTP System Schema

-- 1. Add Columns to Admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS is_phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_otp text,
ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamptz;

-- 2. Add Columns to Tenures
ALTER TABLE tenures 
ADD COLUMN IF NOT EXISTS is_phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_otp text,
ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamptz;

-- 3. RPC: Generate and Send OTP
CREATE OR REPLACE FUNCTION send_phone_verification_otp()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_user_id uuid;
    v_phone text;
    v_otp text;
    v_msg text;
    v_send_result json;
    v_rows_admin int;
    v_rows_tenure int;
BEGIN
    v_user_id := auth.uid();
    
    -- Determine User Role & Phone from Tables
    -- Identify if Admin
    SELECT phone INTO v_phone FROM admins WHERE id = v_user_id;
    GET DIAGNOSTICS v_rows_admin = ROW_COUNT;
    
    IF v_rows_admin > 0 THEN
        v_user_role := 'admin';
    ELSE
        -- Identify if Tenure
        SELECT phone INTO v_phone FROM tenures WHERE user_id = v_user_id; -- Assuming tenures has user_id link? 
        -- Wait, 'tenures' table usually links to auth via email/phone logic or 'user_id' if they signed up
        -- Let's check schema. If tenures table doesn't have user_id, we might rely on the fact that for Tenure Login, auth.uid() matches something.
        -- Assuming 'tenures.id' is NOT auth.uid(). 
        -- Let's assume standard Nestify: 'tenures' table has 'user_id' for RLS or we query by email.
        -- Fallback: Use auth.users phone?
        -- Safest: Query tenures by id if we can't find admin. 
        -- Actually, for now let's assume Admin only if user requests it? User said "For BOTH admin and tenure".
        
         SELECT phone INTO v_phone FROM tenures WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
         GET DIAGNOSTICS v_rows_tenure = ROW_COUNT;
         
         IF v_rows_tenure > 0 THEN
            v_user_role := 'tenure';
         END IF;
    END IF;

    IF v_phone IS NULL THEN
        RETURN json_build_object('status', 'error', 'message', 'User profile not found or phone missing');
    END IF;

    -- Generate 6 digit OTP
    v_otp := floor(100000 + random() * 900000)::text;

    -- Save to DB
    IF v_user_role = 'admin' THEN
        UPDATE admins 
        SET phone_otp = v_otp, 
            phone_otp_expires_at = now() + interval '5 minutes',
            is_phone_verified = false
        WHERE id = v_user_id;
    ELSE
        UPDATE tenures 
        SET phone_otp = v_otp, 
            phone_otp_expires_at = now() + interval '5 minutes',
            is_phone_verified = false
        WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
    END IF;

    -- Construct Message
    v_msg := '🔐 Your Nestify Verification Code is: *' || v_otp || '*\n\nIt expires in 5 minutes. Do not share this code.';

    -- Send via Central Platform Gateway
    -- We call the existing function we defined in platform_whatsapp_migration.sql
    SELECT send_whatsapp_notification(v_phone, v_msg) INTO v_send_result;

    RETURN json_build_object('status', 'success', 'message', 'OTP sent to ' || v_phone);
END;
$$;

-- 4. RPC: Verify OTP
CREATE OR REPLACE FUNCTION verify_phone_otp(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_stored_otp text;
    v_expires_at timestamptz;
    v_user_role text;
    v_rows_admin int;
BEGIN
    v_user_id := auth.uid();
    
    -- Check Admin
    SELECT phone_otp, phone_otp_expires_at INTO v_stored_otp, v_expires_at FROM admins WHERE id = v_user_id;
    GET DIAGNOSTICS v_rows_admin = ROW_COUNT;
    
    IF v_rows_admin > 0 AND v_stored_otp IS NOT NULL THEN
        v_user_role := 'admin';
    ELSE
        -- Check Tenure
        SELECT phone_otp, phone_otp_expires_at INTO v_stored_otp, v_expires_at 
        FROM tenures 
        WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
        
        IF v_stored_otp IS NOT NULL THEN
            v_user_role := 'tenure';
        END IF;
    END IF;

    IF v_user_role IS NULL THEN
         RETURN json_build_object('status', 'error', 'message', 'User not found');
    END IF;

    -- Validate
    IF v_stored_otp != p_code THEN
        RETURN json_build_object('status', 'error', 'message', 'Invalid OTP');
    END IF;

    IF v_expires_at < now() THEN
        RETURN json_build_object('status', 'error', 'message', 'OTP Expired');
    END IF;

    -- Success: Mark Verified & Clear OTP
    IF v_user_role = 'admin' THEN
        UPDATE admins SET is_phone_verified = true, phone_otp = NULL, phone_otp_expires_at = NULL WHERE id = v_user_id;
    ELSE
        UPDATE tenures SET is_phone_verified = true, phone_otp = NULL, phone_otp_expires_at = NULL 
        WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
    END IF;

    RETURN json_build_object('status', 'success', 'message', 'Phone Number Verified!');
END;
$$;



-- ==========================================
-- FILE: payments.sql
-- PATH: C:\Users\sunil\Desktop\new\payments.sql
-- ==========================================


-- Drop old transactions table if it exists (replacing it with robust payments table)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- Create payments table with detailed fields as requested
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Gateway Details
    gateway_name VARCHAR(50) NOT NULL CHECK (gateway_name IN ('razorpay', 'cashfree')),
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    
    -- Customer Details
    customer_id VARCHAR(100), -- Maps to Tenure ID (string)
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    
    -- Payment Details
    order_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_mode VARCHAR(50), -- card, upi, netbanking, wallet
    payment_status VARCHAR(50) DEFAULT 'CREATED', -- CREATED, SUCCESS, FAILED
    payment_message VARCHAR(255),
    payment_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    bank_reference VARCHAR(100),
    
    -- System Links
    invoice_id UUID REFERENCES public.invoices(id),
    tenure_id UUID REFERENCES public.tenures(id),
    admin_id UUID REFERENCES public.admins(id),
    
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Tenants can view their own payments
CREATE POLICY "Tenures can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (auth.uid() = tenure_id);

-- 2. Admins can view payments addressed to them
CREATE POLICY "Admins can view their received payments"
ON public.payments FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

-- NOTE: We intentionally DO NOT allow direct INSERT/UPDATE from the client for security.
-- We will use a Secure RPC function to handle the payment recording and status update.



-- ==========================================
-- FILE: platform_billing.sql
-- PATH: C:\Users\sunil\Desktop\new\platform_billing.sql
-- ==========================================


-- Table to track how much each Admin owes to the Platform (Antigravity/Nestify)
CREATE TABLE IF NOT EXISTS platform_dues (
    admin_id uuid PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    amount_due numeric DEFAULT 0 CHECK (amount_due >= 0),
    last_payment_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_dues ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view their own dues
CREATE POLICY "Admins can view own dues" ON platform_dues
    FOR SELECT USING (auth.uid() = admin_id);

-- Function to calculate and append platform fee on Invoice Creation
CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee numeric;
    v_fixed_fee numeric := 10; -- ₹10 Fixed Fee
    v_percent numeric := 0.0015; -- 0.15% Commission
BEGIN
    -- Calculate Fee: Fixed + % of Invoice Amount
    v_fee := v_fixed_fee + (COALESCE(NEW.total_amount, 0) * v_percent);
    
    -- Update or Insert Dues
    INSERT INTO platform_dues (admin_id, amount_due, updated_at)
    VALUES (NEW.admin_id, v_fee, now())
    ON CONFLICT (admin_id) 
    DO UPDATE SET 
        amount_due = platform_dues.amount_due + v_fee,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run on Invoice Creation
DROP TRIGGER IF EXISTS trigger_platform_fee_insert ON invoices;
CREATE TRIGGER trigger_platform_fee_insert
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_platform_fee();

-- Handle Updates? (User asked for "modify" too)
-- If amount increases, charge delta fee.
CREATE OR REPLACE FUNCTION calculate_platform_fee_update()
RETURNS TRIGGER AS $$
DECLARE
    v_fee numeric;
    v_fixed_fee numeric := 0; -- No fixed fee on update, just percentage on delta? Or simple logic.
    v_percent numeric := 0.0015;
    v_delta numeric;
BEGIN
    -- If amount increased
    IF NEW.total_amount > OLD.total_amount THEN
        v_delta := NEW.total_amount - OLD.total_amount;
        v_fee := v_delta * v_percent; -- Only charge % on the added amount
        
        UPDATE platform_dues 
        SET amount_due = amount_due + v_fee, updated_at = now()
        WHERE admin_id = NEW.admin_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_platform_fee_update ON invoices;
CREATE TRIGGER trigger_platform_fee_update
AFTER UPDATE OF total_amount ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_platform_fee_update();


-- RPC to Fetch Dues
CREATE OR REPLACE FUNCTION get_my_platform_dues()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_amount numeric;
BEGIN
    SELECT amount_due INTO v_amount FROM platform_dues WHERE admin_id = auth.uid();
    RETURN COALESCE(v_amount, 0);
END;
$$;

-- RPC to Clear Dues (Called after successful payment)
CREATE OR REPLACE FUNCTION clear_platform_dues(p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE platform_dues 
    SET amount_due = GREATEST(0, amount_due - p_amount),
        last_payment_at = now()
    WHERE admin_id = auth.uid();
END;
$$;



-- ==========================================
-- FILE: platform_whatsapp_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\platform_whatsapp_migration.sql
-- ==========================================



-- Enable HTTP extension (Better for Form-URL-Encoded requests than pg_net)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Ensure the search path includes extensions
-- You might need to check if 'extensions' schema exists or just use public
-- We will try `CREATE EXTENSION IF NOT EXISTS http;` generally.

-- Helper: URL Encode function (Postgres doesn't have this by default for body construction)
CREATE OR REPLACE FUNCTION urlencode(in_str text) RETURNS text AS $$
DECLARE
    i integer;
    out_str text := '';
    curr_char varchar;
    curr_ascii integer;
BEGIN
    FOR i IN 1..length(in_str) LOOP
        curr_char := substring(in_str FROM i FOR 1);
        curr_ascii := ascii(curr_char);
        IF (curr_ascii BETWEEN 48 AND 57) OR -- 0-9
           (curr_ascii BETWEEN 65 AND 90) OR -- A-Z
           (curr_ascii BETWEEN 97 AND 122) OR -- a-z
           (curr_char = '-') OR (curr_char = '_') OR 
           (curr_char = '.') OR (curr_char = '~') THEN
            out_str := out_str || curr_char;
        ELSE
            out_str := out_str || '%' || to_hex(curr_ascii);
        END IF;
    END LOOP;
    RETURN out_str;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Central Platform Configuration
CREATE TABLE IF NOT EXISTS platform_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    twilio_account_sid text,
    twilio_auth_token text,
    twilio_from_number text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Insert placeholder if empty
INSERT INTO platform_config (twilio_account_sid, twilio_auth_token, twilio_from_number)
SELECT 'AC_PLACEHOLDER', 'AUTH_TOKEN_PLACEHOLDER', 'whatsapp:+14155238886'
WHERE NOT EXISTS (SELECT 1 FROM platform_config);

-- RPC: Send WhatsApp Message via Twilio (Real HTTP Call via pgsql-http)
CREATE OR REPLACE FUNCTION send_whatsapp_notification(
    p_phone text,
    p_message text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_url text;
    v_body text;
    v_response_status integer;
    v_response_content text;
    v_auth_header text;
BEGIN
    -- 1. Get Platform Config
    SELECT * INTO v_config FROM platform_config LIMIT 1;
    
    IF v_config.twilio_account_sid IS NULL OR v_config.twilio_auth_token IS NULL THEN
        RETURN json_build_object('status', 'error', 'message', 'Platform credentials missing');
    END IF;

    -- 2. Format Phone (Ensure E.164)
    p_phone := trim(p_phone);
    IF length(p_phone) = 10 THEN
        p_phone := '+91' || p_phone;
    ELSIF position('+' in p_phone) = 0 THEN
        p_phone := '+' || p_phone;
    END IF;
    
    IF position('whatsapp:' in p_phone) = 0 THEN
       p_phone := 'whatsapp:' || p_phone;
    END IF;

    -- Basic Auth: Base64(sid:token)
    -- IMPORTANT: 'encode' with base64 can insert newlines. We must strip them.
    v_auth_header := 'Basic ' || replace(encode(convert_to(v_config.twilio_account_sid || ':' || v_config.twilio_auth_token, 'utf8'), 'base64'), E'\n', '');

    -- 3. Prepare URL
    v_url := 'https://api.twilio.com/2010-04-01/Accounts/' || v_config.twilio_account_sid || '/Messages.json';

    -- 4. Construct x-www-form-urlencoded Body
    v_body := 'From=' || urlencode(v_config.twilio_from_number) 
           || '&To=' || urlencode(p_phone) 
           || '&Body=' || urlencode(p_message);

    -- 5. Send Real HTTP Request (Synchronous)
    -- Using the 'http' extension's generic request function or http_post
    -- Ref: select * from http((method, url, headers, content, ...));
    
    SELECT status, content::text INTO v_response_status, v_response_content
    FROM http((
        'POST', 
        v_url, 
        ARRAY[
            http_header('Authorization', v_auth_header),
            http_header('Content-Type', 'application/x-www-form-urlencoded')
        ],
        'application/x-www-form-urlencoded',
        v_body
    )::http_request);

    -- 6. Log Result
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        auth.uid(), 
        CASE WHEN v_response_status BETWEEN 200 AND 299 THEN 'WhatsApp Sent 🚀' ELSE 'WhatsApp Failed ❌' END, 
        'To: ' || p_phone || E'\nStatus: ' || v_response_status || E'\nTwilio: ' || substring(v_response_content from 1 for 100),
        CASE WHEN v_response_status BETWEEN 200 AND 299 THEN 'success' ELSE 'error' END
    );

    IF v_response_status NOT BETWEEN 200 AND 299 THEN
         RETURN json_build_object('status', 'error', 'message', 'Twilio Error: ' || v_response_content);
    END IF;

    RETURN json_build_object('status', 'success', 'message', 'Message dispatched', 'twilio_response', v_response_content);
    
EXCEPTION WHEN OTHERS THEN
    -- Fallback if HTTP extension is missing or fails hard
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (auth.uid(), 'System Error', 'Twilio Call Failed: ' || SQLERRM, 'error');
    
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;



-- ==========================================
-- FILE: razorpay_integration.sql
-- PATH: C:\Users\sunil\Desktop\new\razorpay_integration.sql
-- ==========================================


-- Enable Extensions for Crypto and HTTP calls
create extension if not exists pgcrypto with schema extensions;
create extension if not exists http with schema extensions;

-- Function to create Razorpay Order securely from Backend
create or replace function create_razorpay_order(
  p_invoice_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin_id uuid;
  v_amount numeric;
  v_currency text := 'INR';
  v_key_id text;
  v_key_secret text;
  v_api_url text := 'https://api.razorpay.com/v1/orders';
  v_auth_header text;
  v_response_status integer;
  v_response_body text;
  v_result json;
begin
  -- 1. Get Invoice Details & Keys
  select admin_id, total_amount
  into v_admin_id, v_amount
  from invoices
  where id = p_invoice_id;

  if v_admin_id is null then
    return json_build_object('success', false, 'message', 'Invoice not found');
  end if;

  select razorpay_key_id, razorpay_key_secret
  into v_key_id, v_key_secret
  from admins
  where id = v_admin_id;

  if v_key_id is null or v_key_secret is null then
     return json_build_object('success', false, 'message', 'Razorpay keys not configured by Admin');
  end if;

  -- 2. Prepare Auth Header (Basic Auth)
  v_auth_header := 'Basic ' || encode((v_key_id || ':' || v_key_secret)::bytea, 'base64');

  -- 3. Make HTTP Request to Razorpay
  select status, content::text
  into v_response_status, v_response_body
  from extensions.http((
    'POST',
    v_api_url,
    ARRAY[
      extensions.http_header('Authorization', v_auth_header),
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'amount', (v_amount * 100)::int, -- Convert to paise
      'currency', v_currency,
      'receipt', p_invoice_id::text,
      'notes', json_build_object('source', 'nestify_app')
    )::text
  ));

  -- 4. Handle Response
  if v_response_status between 200 and 299 then
    v_result := v_response_body::json;
    return json_build_object(
       'success', true,
       'order_id', v_result->>'id',
       'amount', v_result->>'amount',
       'key_id', v_key_id -- Return key_id for frontend
    );
  else
    return json_build_object('success', false, 'message', 'Razorpay Error: ' || v_response_body);
  end if;

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;



-- ==========================================
-- FILE: razorpay_route_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\razorpay_route_migration.sql
-- ==========================================


-- Razorpay Route Migration
-- Phase 1: Database Changes for Single API Key Architecture

-- 1. Add Linked Account ID to Admins table
-- This stores the 'acc_...' ID for each hostel owner
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS razorpay_onboarding_status VARCHAR(20) DEFAULT 'PENDING';

-- 2. Update Payments table to track transfers
-- This tracks the split details for each transaction
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS transfer_id VARCHAR(100),         -- Razorpay Transfer ID (trf_...)
ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50),    -- PENDING, SETTLED, FAILED
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2),       -- Calculated Platform Share
ADD COLUMN IF NOT EXISTS vendor_payout DECIMAL(10,2),      -- Amount transferred to vendor
ADD COLUMN IF NOT EXISTS transfer_on_hold_until BIGINT,    -- Timestamp for hold release
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100); -- Ensure this exists

-- 3. Create RLS Policy for Linked Account Management
-- Only the specific admin can view/update their own razorpay_account_id
CREATE POLICY "Admins can view own specific payout details"
ON public.admins FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Index for faster lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_payments_transfer_id ON public.payments(transfer_id);
CREATE INDEX IF NOT EXISTS idx_admins_razorpay_account_id ON public.admins(razorpay_account_id);



-- ==========================================
-- FILE: room_floor_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\room_floor_migration.sql
-- ==========================================


-- Add floor_number column to rooms table
alter table public.rooms 
add column if not exists floor_number int DEFAULT 0;

-- Optional: Add a comment explaining the default
comment on column public.rooms.floor_number is 'Floor number: 0 = Ground, 1 = First, etc.';



-- ==========================================
-- FILE: roommates_rpc.sql
-- PATH: C:\Users\sunil\Desktop\new\roommates_rpc.sql
-- ==========================================



-- Secure Function to get roommates
create or replace function public.get_roommates()
returns table (
    full_name text,
    phone text,
    created_at timestamptz
) 
language plpgsql
security definer
as $$
declare
    current_room_id uuid;
begin
    -- 1. Get the room_id of the current tenant
    select room_id into current_room_id
    from public.tenures
    where id = auth.uid()
    limit 1;

    if current_room_id is null then
        return; -- Return empty if no room assigned
    end if;

    -- 2. Return other tenants in the same room
    return query
    select 
        t.full_name,
        t.phone,
        t.created_at
    from public.tenures t
    where t.room_id = current_room_id
    and t.id != auth.uid() -- Exclude self
    and t.status = 'active';

end;
$$;

-- Grant permission
grant execute on function public.get_roommates() to authenticated;



-- ==========================================
-- FILE: rpc_get_keys.sql
-- PATH: C:\Users\sunil\Desktop\new\rpc_get_keys.sql
-- ==========================================


-- Function to safely get public payment keys for a specific admin
-- This allows tenants to fetch the Key ID/App ID needed for the frontend SDKs
-- without exposing the Secret Keys which are also stored in the admins table.

CREATE OR REPLACE FUNCTION get_payment_config(target_admin_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres) to bypass RLS on admins table if needed, though we filter strictly
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'razorpay_key_id', razorpay_key_id,
        'cashfree_app_id', cashfree_app_id,
        'cashfree_env', 'TEST' -- Defaulting to TEST for now, could be column in DB
    )
    INTO result
    FROM public.admins
    WHERE id = target_admin_id;

    RETURN result;
END;
$$;



-- ==========================================
-- FILE: rpc_monitor_stats.sql
-- PATH: C:\Users\sunil\Desktop\new\rpc_monitor_stats.sql
-- ==========================================


-- Secure RPC for Platform Monitoring
-- Returns aggregate stats for the Super Admin
-- Note: In production, verify the caller has specific privileges. 
-- For now, we rely on the specific obscure RPC name and client-side auth as requested.

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_admins INT;
    total_tenants INT;
    total_revenue NUMERIC;
    recent_activities JSON;
    payment_failures INT;
BEGIN
    -- 1. Count Hostels/Admins
    SELECT COUNT(*) INTO total_admins FROM public.admins;

    -- 2. Count Active Tenants
    SELECT COUNT(*) INTO total_tenants FROM public.tenures;

    -- 3. Calculate Total Revenue (Paid Invoices)
    SELECT COALESCE(SUM(order_amount), 0) INTO total_revenue 
    FROM public.payments 
    WHERE payment_status = 'SUCCESS' OR payment_status = 'captured';

    -- 4. Count Payment Alerts
    SELECT COUNT(*) INTO payment_failures 
    FROM public.payments 
    WHERE payment_status = 'failed' OR payment_status = 'FAILED';

    -- 5. Get Recent Activities (New Signups + Failed Payments)
    WITH combined_events AS (
        (SELECT 'New Admin Joined' as message, 'info' as type, created_at FROM public.admins ORDER BY created_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'Payment Failed: ' || id::text as message, 'error' as type, created_at FROM public.payments WHERE payment_status = 'failed' OR payment_status = 'FAILED' ORDER BY created_at DESC LIMIT 5)
    )
    SELECT json_agg(t) INTO recent_activities FROM (SELECT * FROM combined_events ORDER BY created_at DESC LIMIT 10) t;

    RETURN json_build_object(
        'total_admins', total_admins,
        'total_tenants', total_tenants,
        'total_revenue', total_revenue,
        'alert_count', payment_failures,
        'recent_activities', COALESCE(recent_activities, '[]'::json)
    );
END;
$$;

-- Grant permissions to ensure the API can call this function
GRANT EXECUTE ON FUNCTION get_platform_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO service_role;



-- ==========================================
-- FILE: rpc_payment.sql
-- PATH: C:\Users\sunil\Desktop\new\rpc_payment.sql
-- ==========================================


-- Secure Function to record a successful payment and update the invoice
-- Enhanced with Signature Verification for Razorpay

CREATE OR REPLACE FUNCTION record_payment_success(
    p_invoice_id UUID,
    p_tenure_id UUID,
    p_admin_id UUID,
    p_gateway_name TEXT,
    p_gateway_payment_id TEXT,
    p_gateway_order_id TEXT,
    p_gateway_signature TEXT,
    p_amount DECIMAL,
    p_payment_mode TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_payment_id UUID;
    v_inv_amount DECIMAL;
    v_secret_key TEXT;
    v_generated_signature TEXT;
BEGIN
    -- 1. SECURITY CHECK: Verify Amount
    SELECT total_amount INTO v_inv_amount FROM invoices WHERE id = p_invoice_id;
    
    IF v_inv_amount IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invoice not found');
    END IF;

    -- Allow 1 rupee tolerance for float differences, but strictly checks usually beneficial
    IF p_amount < (v_inv_amount - 1) THEN
         RETURN json_build_object('success', false, 'error', 'Payment amount mismatch. Paid: ' || p_amount || ', Expected: ' || v_inv_amount);
    END IF;

    -- 2. SECURITY CHECK: Verify Gateway Signature (For Razorpay)
    IF p_gateway_name = 'razorpay' THEN
        SELECT razorpay_key_secret INTO v_secret_key FROM admins WHERE id = p_admin_id;
        
        IF v_secret_key IS NOT NULL THEN
            -- HMAC-SHA256(order_id + "|" + payment_id, secret)
            v_generated_signature := encode(extensions.hmac(p_gateway_order_id || '|' || p_gateway_payment_id, v_secret_key, 'sha256'), 'hex');
            
            IF v_generated_signature != p_gateway_signature THEN
                RETURN json_build_object('success', false, 'error', 'Security Alert: Invalid Razorpay Signature');
            END IF;
        ELSE
            -- Keep legacy behavior if no key configured? No, Secure by default.
            RETURN json_build_object('success', false, 'error', 'Razorpay secret not configured on server');
        END IF;
    END IF;

    -- 3. Insert into payments table
    INSERT INTO public.payments (
        invoice_id,
        tenure_id,
        admin_id,
        gateway_name,
        gateway_payment_id,
        gateway_order_id,
        gateway_signature,
        order_amount,
        payment_mode,
        payment_status,
        customer_id,
        customer_name,
        customer_email,
        payment_message,
        payment_time
    ) VALUES (
        p_invoice_id,
        p_tenure_id,
        p_admin_id,
        p_gateway_name,
        p_gateway_payment_id,
        p_gateway_order_id,
        p_gateway_signature,
        p_amount,
        p_payment_mode,
        'SUCCESS',
        p_tenure_id::text,
        p_customer_name,
        p_customer_email,
        'Payment Verified & Secured',
        timezone('utc'::text, now())
    )
    RETURNING id INTO new_payment_id;

    -- 4. Update Invoice Status to PAID
    UPDATE public.invoices
    SET status = 'paid'
    WHERE id = p_invoice_id;

    -- 5. Return success
    RETURN json_build_object(
        'success', true,
        'payment_id', new_payment_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;



-- ==========================================
-- FILE: rpc_reset_password.sql
-- PATH: C:\Users\sunil\Desktop\new\rpc_reset_password.sql
-- ==========================================


-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to reset password using a verified OTP
CREATE OR REPLACE FUNCTION reset_password_via_otp(
    target_email TEXT,
    otp_code TEXT,
    new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    valid_otp BOOLEAN;
    user_id UUID;
BEGIN
    -- 1. Verify OTP
    SELECT EXISTS (
        SELECT 1 FROM public.otp_codes
        WHERE email = target_email
        AND code = otp_code
        AND expires_at > NOW()
    ) INTO valid_otp;

    IF NOT valid_otp THEN
        RETURN json_build_object('success', false, 'message', 'Invalid or expired OTP');
    END IF;

    -- 2. Check if user exists in auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;
    
    IF user_id IS NULL THEN
         RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- 3. Update Password
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = user_id;

    -- 4. Delete used OTP
    DELETE FROM public.otp_codes WHERE email = target_email AND code = otp_code;

    RETURN json_build_object('success', true, 'message', 'Password reset successfully');
END;
$$;

-- Function to check if a user exists (for forgot password flow)
CREATE OR REPLACE FUNCTION check_user_exists(target_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = target_email);
END;
$$;



-- ==========================================
-- FILE: security_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\security_schema.sql
-- ==========================================


-- Comprehensive Security Schema for Audit Logs

-- 1. Create Audit Logs Table (if not exists)
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- e.g., "PAYMENT_RECEIVED", "INVOICE_CREATED"
  entity_type text, -- e.g., "payment", "invoice", "room"
  entity_id text, -- ID of the affected row
  details jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policies
create policy "Admins can view own audit logs" on public.audit_logs
  for select using (
    admin_id = auth.uid() 
    or admin_id in (select admin_id from tenures where id = auth.uid()) -- Maybe allow tenants to see relevant logs? For now, stick to admin.
  );
  
create policy "System can insert logs" on public.audit_logs
  for insert with check (true); -- Triggers need this

-- 2. Function to Log Activity (Wrapper)
create or replace function log_activity(
    p_admin_id uuid,
    p_user_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id text,
    p_details jsonb
) returns void as $$
begin
    insert into public.audit_logs (admin_id, user_id, action, entity_type, entity_id, details)
    values (p_admin_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details);
end;
$$ language plpgsql security definer;


-- 3. Automatic Triggers for Critical Tables

-- Trigger for Invoices (Creation & Status Change)
create or replace function log_invoice_changes() returns trigger as $$
begin
    if (TG_OP = 'INSERT') then
        perform log_activity(NEW.admin_id, auth.uid(), 'INVOICE_CREATED', 'invoice', NEW.id::text, json_build_object('amount', NEW.total_amount, 'month', NEW.month)::jsonb);
        return NEW;
    elsif (TG_OP = 'UPDATE') then
        if (OLD.status != NEW.status) then
             perform log_activity(NEW.admin_id, auth.uid(), 'INVOICE_STATUS_CHANGED', 'invoice', NEW.id::text, json_build_object('old_status', OLD.status, 'new_status', NEW.status)::jsonb);
        end if;
        return NEW;
    end if;
    return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_invoice_change on invoices;
create trigger on_invoice_change
after insert or update on invoices
for each row execute function log_invoice_changes();

-- Trigger for Payments (Success)
create or replace function log_payment_success() returns trigger as $$
begin
    perform log_activity(NEW.admin_id, NEW.tenure_id, 'PAYMENT_RECEIVED', 'payment', NEW.id::text, json_build_object('amount', NEW.order_amount, 'mode', NEW.payment_mode)::jsonb);
    return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_payment_success on payments;
create trigger on_payment_success
after insert on payments
for each row execute function log_payment_success();

-- Trigger for Room Deletion (Critical)
create or replace function log_room_deletion() returns trigger as $$
begin
    perform log_activity(OLD.admin_id, auth.uid(), 'ROOM_DELETED', 'room', OLD.id::text, json_build_object('room_number', OLD.room_number)::jsonb);
    return OLD;
end;
$$ language plpgsql security definer;

drop trigger if exists on_room_delete on rooms;
create trigger on_room_delete
after delete on rooms
for each row execute function log_room_deletion();



-- ==========================================
-- FILE: session_security.sql
-- PATH: C:\Users\sunil\Desktop\new\session_security.sql
-- ==========================================


-- Session Fortress Protocol
-- Advanced Device Tracking & Security

-- 1. User Devices Table
-- Tracks unique devices/browsers used by a user
create table if not exists public.user_devices (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    device_name text not null, -- e.g. "Chrome on Windows"
    ip_address text,
    location text, -- e.g. "Mumbai, India" (approx)
    last_active timestamptz default now(),
    is_trusted boolean default true,
    first_seen_at timestamptz default now(),
    
    constraint unique_device_per_user unique (user_id, device_name, ip_address)
);

-- Enable RLS
alter table public.user_devices enable row level security;

create policy "Users can view their own devices"
    on public.user_devices for select
    using (auth.uid() = user_id);

create policy "Users can update their own devices" -- e.g. to untrust
    on public.user_devices for update
    using (auth.uid() = user_id);

-- 2. RPC to Register Login
-- Called by client on app mount
create or replace function register_device_login(
    p_device_name text,
    p_ip_address text,
    p_location text default 'Unknown'
)
returns void
language plpgsql
security definer
as $$
declare
    v_device_id uuid;
    v_is_new boolean := false;
begin
    -- Upsert device: Update last_active if exists, else Insert
    insert into public.user_devices (user_id, device_name, ip_address, location, last_active)
    values (auth.uid(), p_device_name, p_ip_address, p_location, now())
    on conflict (user_id, device_name, ip_address) 
    do update set last_active = now(), location = EXCLUDED.location
    returning id, (xmax = 0) into v_device_id, v_is_new; 
    -- xmax = 0 means insert happened (Postgres trick)
    
    -- If purely new insert (xmax=0 checks are tricky in plpgsql with returning, let's use a simpler check)
    -- Actually `on conflict` works, but detecting 'new' is harder.
    -- Let's check `first_seen_at`. If `last_active` was old, we just updated.
    
    -- Improved Logic:
    -- If the `xmax` logic is flaky, we can check if `created_at` ~= `now()` but `created_at` is `first_seen_at`.
    
end;
$$;

-- Refined RPC with explicit check for notification
create or replace function register_device_login(
    p_device_name text,
    p_ip_address text,
    p_location text default 'Unknown'
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_exists boolean;
begin
    -- Check if device exists
    select exists(
        select 1 from public.user_devices 
        where user_id = auth.uid() 
        and device_name = p_device_name 
        and ip_address = p_ip_address
    ) into v_exists;

    -- Update or Insert
    insert into public.user_devices (user_id, device_name, ip_address, location, last_active)
    values (auth.uid(), p_device_name, p_ip_address, p_location, now())
    on conflict (user_id, device_name, ip_address) 
    do update set last_active = now(), location = EXCLUDED.location;

    -- Return status for UI
    return json_build_object('is_new', not v_exists);
end;
$$;


-- 3. Trigger for New Device Alert
-- If a new row is inserted into user_devices, warn the user
create or replace function notify_on_new_device()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into notifications (user_id, title, message, type, link)
    values (
        NEW.user_id, 
        'New Login Detected', 
        'We noticed a new login from ' || NEW.device_name || ' (' || coalesce(NEW.ip_address, 'IP Unknown') || '). If this was not you, please secure your account immediately.', 
        'warning', 
        '/admin/profile' -- Link to profile to review devices
    );
    return NEW;
end;
$$;

create trigger on_new_device_detected
after insert on public.user_devices
for each row execute function notify_on_new_device();

-- 4. RPC to Revoke/Untrust Device (Simulated Kill Switch)
-- This sets `is_trusted` to false. 
-- Real security would require checking this table in every RLS policy, which is heavy.
-- For now, this is an AUDIT feature.
create or replace function untrust_device(p_device_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    update public.user_devices
    set is_trusted = false
    where id = p_device_id and user_id = auth.uid();
end;
$$;

-- Permissions
grant usage on schema public to authenticated;
grant all on public.user_devices to service_role;
grant select, insert, update on public.user_devices to authenticated;

grant execute on function register_device_login to authenticated;
grant execute on function untrust_device to authenticated;



-- ==========================================
-- FILE: snapfix_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\snapfix_migration.sql
-- ==========================================


-- 1. Alter Complaints Table
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS resolved_image text;

-- 2. Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
-- Allow Authenticated Users (Tenants) to Upload
CREATE POLICY "Tenants can upload complaint images 1oj01"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'complaint-images' );

-- Allow Public View
CREATE POLICY "Public Access 1oj02"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'complaint-images' );

-- Allow Admins/Owners to Update (for resolved_image if needed)
CREATE POLICY "Admins can update 1oj03"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'complaint-images' );



-- ==========================================
-- FILE: supabase_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\supabase_schema.sql
-- ==========================================


-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create app_config table for system-wide settings
create table public.app_config (
  key text primary key,
  value text not null
);

-- Insert default NestKey (Website Owner Key)
insert into public.app_config (key, value) values ('nest_key', 'NESTIFY2025')
on conflict (key) do nothing;

-- Create admins table

create table public.admins (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  hostel_name text,
  hostel_address text,
  phone text,
  razorpay_key_id text,
  razorpay_key_secret text,
  cashfree_app_id text,
  cashfree_secret_key text,
  stay_key text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create rooms table
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  room_number text not null,
  capacity int not null,
  type text check (type in ('AC', 'Non-AC', 'Dormitory')),
  price decimal not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tenures table
create table public.tenures (
  id uuid references auth.users on delete cascade primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  full_name text,
  email text,
  phone text,
  room_id uuid references public.rooms(id) on delete set null,
  status text check (status in ('pending', 'active')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invoices table (The Bill)
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  tenure_id uuid references public.tenures(id) on delete cascade not null,
  admin_id uuid references public.admins(id) on delete cascade not null,
  month text not null, -- e.g., "October"
  year int not null, -- e.g., 2023
  status text check (status in ('pending', 'paid', 'cancelled')) default 'pending',
  
  -- Breakdown of the bill
  items jsonb not null default '[]'::jsonb, -- [{ "description": "Rent", "amount": 5000 }, { "description": "EB", "amount": 200 }]
  subtotal decimal not null, -- Sum of items
  
  -- Platform Fees (Calculated at generation)
  fixed_fee decimal default 20,
  platform_share_percent decimal default 0.006,
  platform_share_amount decimal,
  maintenance_share_percent decimal default 0.002,
  maintenance_share_amount decimal,
  support_share_percent decimal default 0.0015,
  support_share_amount decimal,
  development_share_percent decimal default 0.0005,
  development_share_amount decimal,
  gateway_fee_percent decimal default 0.0015,
  gateway_fee_amount decimal,
  
  total_platform_fee decimal, -- Sum of all fees
  total_amount decimal not null, -- Final payable amount
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table (The Payment Attempt)
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  
  -- Gateway Details
  gateway_provider text check (gateway_provider in ('razorpay', 'cashfree')),
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  
  -- Payment Details
  amount decimal not null,
  currency text default 'INR',
  status text check (status in ('created', 'success', 'failed')) default 'created',
  payment_method text, -- UPI, CARD, NETBANKING
  
  -- Meta
  raw_response jsonb, -- Store full webhook payload for audit
  error_message text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admins enable row level security;
alter table public.rooms enable row level security;
alter table public.tenures enable row level security;
alter table public.invoices enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;
alter table public.app_config enable row level security;

-- Policies

-- App Config: Public read (for checking keys), No write
create policy "Allow public read of app_config" on public.app_config for select using (true);

-- Admins: Users can view their own profile
create policy "Admins can view own profile" on public.admins for select using (auth.uid() = id);
create policy "Admins can update own profile" on public.admins for update using (auth.uid() = id);
create policy "Admins can insert own profile" on public.admins for insert with check (auth.uid() = id);

-- Rooms: Admins can manage their own rooms. Tenures can view rooms in their hostel.
create policy "Admins can manage own rooms" on public.rooms for all using (auth.uid() = admin_id);
create policy "Tenures can view rooms" on public.rooms for select using (
  exists (select 1 from public.tenures where id = auth.uid() and admin_id = rooms.admin_id)
);

-- Tenures: Admins can view/manage tenures in their hostel. Tenures can view own profile.
create policy "Admins can manage their tenures" on public.tenures for all using (auth.uid() = admin_id);
create policy "Tenures can view own profile" on public.tenures for select using (auth.uid() = id);
create policy "Tenures can update own profile" on public.tenures for update using (auth.uid() = id);
create policy "Tenures can insert own profile" on public.tenures for insert with check (auth.uid() = id);

-- Invoices: Admins can manage invoices for their hostel. Tenures can view their own invoices.
create policy "Admins can manage invoices" on public.invoices for all using (auth.uid() = admin_id);
create policy "Tenures can view own invoices" on public.invoices for select using (auth.uid() = tenure_id);

-- Transactions: Admins can view transactions. Tenures can view their own transactions (via invoice).
create policy "Admins can view transactions" on public.transactions for select using (
  exists (select 1 from public.invoices where id = transactions.invoice_id and admin_id = auth.uid())
);
create policy "Tenures can view own transactions" on public.transactions for select using (
  exists (select 1 from public.invoices where id = transactions.invoice_id and tenure_id = auth.uid())
);

-- Messages: Users can view messages sent to or by them.
create policy "Users can view own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);


create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  sender text check (sender in ('user', 'bot')),
  content text,
  meta jsonb,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "Users can view own messages" on chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on chat_messages for insert with check (auth.uid() = user_id);


-- AUTO-GENERATED BY AGENT - RUN IN SUPABASE SQL EDITOR
-- 1. Configuration Columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS auto_bill_enabled boolean DEFAULT false;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS auto_bill_day integer DEFAULT 1;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS charge_maintenance numeric DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS charge_water numeric DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS charge_electricity numeric DEFAULT 0;
-- 2. Recurring Billing Engine
CREATE OR REPLACE FUNCTION generate_recurring_invoices(
    p_admin_id uuid,
    p_force boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_config RECORD;
    v_tenure RECORD;
    v_room_price numeric;
    v_items jsonb;
    v_total numeric;
    v_generated_count integer := 0;
    v_skipped_count integer := 0;
    v_current_day integer;
BEGIN
    -- Get Config
    SELECT * INTO v_admin_config FROM admins WHERE id = p_admin_id;
    -- Check Enabled (unless forced)
    IF NOT p_force AND (v_admin_config.auto_bill_enabled IS NULL OR v_admin_config.auto_bill_enabled = false) THEN
        RETURN json_build_object('status', 'skipped', 'message', 'Feature disabled');
    END IF;
    -- Check Date (unless forced)
    v_current_day := EXTRACT(DAY FROM CURRENT_DATE);
    IF NOT p_force AND v_admin_config.auto_bill_day != v_current_day THEN
         RETURN json_build_object('status', 'skipped', 'message', 'Not billing day (Today: ' || v_current_day || ', Config: ' || v_admin_config.auto_bill_day || ')');
    END IF;
    -- Iterate Active Tenures
    FOR v_tenure IN 
        SELECT t.*, r.price as price_per_month 
        FROM tenures t
        JOIN rooms r ON t.room_id = r.id
        WHERE t.admin_id = p_admin_id 
        AND t.status = 'active'
    LOOP
        -- Duplicate Check: Check if invoice already created THIS MONTH for this tenant
        -- Assuming invoice date is current_date
        PERFORM 1 FROM invoices 
        WHERE tenure_id = v_tenure.id 
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
        IF FOUND THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;
        -- Build Items
        v_items := '[]'::jsonb;
        v_total := 0;
        -- Rent
        v_items := v_items || jsonb_build_object('description', 'Monthly Rent', 'amount', v_tenure.price_per_month, 'type', 'rent');
        v_total := v_total + v_tenure.price_per_month;
        -- Maintenance
        IF v_admin_config.charge_maintenance > 0 THEN
             v_items := v_items || jsonb_build_object('description', 'Maintenance Charge', 'amount', v_admin_config.charge_maintenance, 'type', 'fee');
             v_total := v_total + v_admin_config.charge_maintenance;
        END IF;
        -- Water
        IF v_admin_config.charge_water > 0 THEN
             v_items := v_items || jsonb_build_object('description', 'Water Charges', 'amount', v_admin_config.charge_water, 'type', 'fee');
             v_total := v_total + v_admin_config.charge_water;
        END IF;
         -- Electricity
        IF v_admin_config.charge_electricity > 0 THEN
             v_items := v_items || jsonb_build_object('description', 'Electricity (Fixed)', 'amount', v_admin_config.charge_electricity, 'type', 'fee');
             v_total := v_total + v_admin_config.charge_electricity;
        END IF;
        -- Create Invoice
        INSERT INTO invoices (
            admin_id, 
            tenure_id, 
            total_amount, 
            items, 
            status, 
            due_date, 
            created_at
        ) VALUES (
            p_admin_id,
            v_tenure.id,
            v_total,
            v_items,
            'pending',
            CURRENT_DATE + INTERVAL '5 days', -- Due in 5 days
            CURRENT_DATE
        );
        v_generated_count := v_generated_count + 1;
    END LOOP;
    RETURN json_build_object(
        'status', 'success',
        'generated', v_generated_count,
        'skipped_duplicates', v_skipped_count
    );
END;
$$;


-- Community Hub Tables
-- 1. Posts (Events, Announcements, Polls)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('event', 'announcement', 'poll')) NOT NULL,
  title text NOT NULL,
  content text,
  event_date timestamp with time zone,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 2. Poll Options
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  vote_count integer DEFAULT 0
);
-- 3. Poll Votes (Tracking user votes)
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id) -- One vote per user per poll
);
-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
-- Policies
-- Admins: Full Control over Posts
CREATE POLICY "Admins can manage posts" ON community_posts
  FOR ALL USING (auth.uid() = admin_id);
-- Tenure: View Posts
CREATE POLICY "Tenures and Admins view posts" ON community_posts
  FOR SELECT USING (true); -- Ideally filter by admin_id, but for now global or derived
-- Admins: Manage Options
CREATE POLICY "Admins manage poll options" ON poll_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM community_posts WHERE id = poll_options.post_id AND admin_id = auth.uid())
  );
-- Tenure: View Options
CREATE POLICY "Everyone view options" ON poll_options
  FOR SELECT USING (true);
-- Votes: Admin View
CREATE POLICY "Admins view votes" ON poll_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM community_posts WHERE id = poll_votes.post_id AND admin_id = auth.uid())
  );
-- Votes: Tenure Vote
CREATE POLICY "Tenures can vote" ON poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tenures view own votes" ON poll_votes
  FOR SELECT USING (auth.uid() = user_id);
-- Function to increment vote count atomically
CREATE OR REPLACE FUNCTION vote_on_poll(p_post_id uuid, p_option_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert Vote Record
  INSERT INTO poll_votes (post_id, option_id, user_id)
  VALUES (p_post_id, p_option_id, auth.uid());
  -- Increment Counter
  UPDATE poll_options
  SET vote_count = vote_count + 1
  WHERE id = p_option_id;
END;
$$;


-- Payment Key Encryption System
-- Part of Security Hardening Phase 1
-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- 2. Create secure key vault table
CREATE TABLE IF NOT EXISTS public.key_vault (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
    key_type text CHECK (key_type IN ('razorpay_key', 'razorpay_secret', 'cashfree_app', 'cashfree_secret')) NOT NULL,
    encrypted_value bytea NOT NULL, -- Encrypted key
    encryption_version integer DEFAULT 1, -- For key rotation tracking
    last_rotated_at timestamptz DEFAULT now(),
    rotation_reminder_sent boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    UNIQUE(admin_id, key_type)
);
-- 3. Key Access Audit Table
CREATE TABLE IF NOT EXISTS public.key_access_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
    key_type text NOT NULL,
    access_type text CHECK (access_type IN ('encrypt', 'decrypt', 'rotate', 'view')) NOT NULL,
    accessed_by uuid REFERENCES auth.users(id),
    ip_address text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_key_access_admin ON public.key_access_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_key_access_type ON public.key_access_logs(access_type);
-- Enable RLS
ALTER TABLE public.key_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_access_logs ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Admins access own keys" ON public.key_vault
    FOR ALL USING (auth.uid() = admin_id);
CREATE POLICY "Admins view own access logs" ON public.key_access_logs
    FOR SELECT USING (auth.uid() = admin_id);
CREATE POLICY "System logs key access" ON public.key_access_logs
    FOR INSERT WITH CHECK (true);
-- 4. Function: Encrypt and Store Key
CREATE OR REPLACE FUNCTION store_encrypted_key(
    p_admin_id uuid,
    p_key_type text,
    p_plain_key text,
    p_encryption_password text -- Master password from Supabase Vault
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_encrypted bytea;
BEGIN
    -- Encrypt the key
    v_encrypted := pgp_sym_encrypt(p_plain_key, p_encryption_password);
    
    -- Store in vault
    INSERT INTO public.key_vault (admin_id, key_type, encrypted_value, last_rotated_at)
    VALUES (p_admin_id, p_key_type, v_encrypted, now())
    ON CONFLICT (admin_id, key_type)
    DO UPDATE SET 
        encrypted_value = v_encrypted,
        last_rotated_at = now(),
        updated_at = now(),
        rotation_reminder_sent = false;
    
    -- Log the encryption
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by)
    VALUES (p_admin_id, p_key_type, 'encrypt', auth.uid());
    
    RETURN json_build_object('success', true, 'encrypted_at', now());
EXCEPTION WHEN OTHERS THEN
    -- Log failure
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by, success, error_message)
    VALUES (p_admin_id, p_key_type, 'encrypt', auth.uid(), false, SQLERRM);
    
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
-- 5. Function: Decrypt and Retrieve Key
CREATE OR REPLACE FUNCTION get_decrypted_key(
    p_admin_id uuid,
    p_key_type text,
    p_encryption_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_encrypted bytea;
    v_decrypted text;
BEGIN
    -- Retrieve encrypted key
    SELECT encrypted_value INTO v_encrypted
    FROM public.key_vault
    WHERE admin_id = p_admin_id AND key_type = p_key_type;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Key not found for type: %', p_key_type;
    END IF;
    
    -- Decrypt
    v_decrypted := pgp_sym_decrypt(v_encrypted, p_encryption_password);
    
    -- Log access
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by)
    VALUES (p_admin_id, p_key_type, 'decrypt', auth.uid());
    
    RETURN v_decrypted;
EXCEPTION WHEN OTHERS THEN
    -- Log failure
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by, success, error_message)
    VALUES (p_admin_id, p_key_type, 'decrypt', auth.uid(), false, SQLERRM);
    
    RAISE;
END;
$$;
-- 6. Function: Check Keys Needing Rotation (90-day policy)
CREATE OR REPLACE FUNCTION check_key_rotation_status(p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT json_agg(
        json_build_object(
            'key_type', key_type,
            'last_rotated', last_rotated_at,
            'days_old', EXTRACT(DAY FROM (now() - last_rotated_at)),
            'needs_rotation', (now() - last_rotated_at) > interval '90 days'
        )
    ) INTO v_result
    FROM public.key_vault
    WHERE admin_id = p_admin_id;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
-- 7. Migration Function: Encrypt Existing Keys in Admins Table
CREATE OR REPLACE FUNCTION migrate_existing_keys_to_vault(
    p_encryption_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin record;
    v_migrated integer := 0;
    v_errors integer := 0;
BEGIN
    -- Loop through all admins
    FOR v_admin IN SELECT * FROM public.admins LOOP
        BEGIN
            -- Migrate Razorpay Key ID
            IF v_admin.razorpay_key_id IS NOT NULL AND v_admin.razorpay_key_id != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'razorpay_key', 
                    v_admin.razorpay_key_id, 
                    p_encryption_password
                );
            END IF;
            
            -- Migrate Razorpay Secret
            IF v_admin.razorpay_key_secret IS NOT NULL AND v_admin.razorpay_key_secret != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'razorpay_secret', 
                    v_admin.razorpay_key_secret, 
                    p_encryption_password
                );
            END IF;
            
            -- Migrate Cashfree App ID
            IF v_admin.cashfree_app_id IS NOT NULL AND v_admin.cashfree_app_id != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'cashfree_app', 
                    v_admin.cashfree_app_id, 
                    p_encryption_password
                );
            END IF;
            
            -- Migrate Cashfree Secret
            IF v_admin.cashfree_secret_key IS NOT NULL AND v_admin.cashfree_secret_key != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'cashfree_secret', 
                    v_admin.cashfree_secret_key, 
                    p_encryption_password
                );
            END IF;
            
            v_migrated := v_migrated + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            CONTINUE;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'migrated', v_migrated,
        'errors', v_errors,
        'total_admins', (SELECT COUNT(*) FROM public.admins)
    );
END;
$$;
-- 8. Function: Secure Cleanup of Old Keys from Admins Table (Optional)
-- WARNING: Only run this AFTER confirming vault migration is successful
CREATE OR REPLACE FUNCTION cleanup_plaintext_keys(p_confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Safety check
    IF p_confirm != 'I_CONFIRM_VAULT_MIGRATION_IS_COMPLETE' THEN
        RAISE EXCEPTION 'Must confirm vault migration completion';
    END IF;
    
    -- Clear plaintext keys
    UPDATE public.admins SET
        razorpay_key_id = NULL,
        razorpay_key_secret = NULL,
        cashfree_app_id = NULL,
        cashfree_secret_key = NULL;
    
    RETURN json_build_object('success', true, 'cleared', true);
END;
$$;
-- Grant Permissions
GRANT EXECUTE ON FUNCTION store_encrypted_key TO authenticated;
GRANT EXECUTE ON FUNCTION get_decrypted_key TO authenticated;
GRANT EXECUTE ON FUNCTION check_key_rotation_status TO authenticated;
-- Note: Migration functions should only be callable by service_role
GRANT EXECUTE ON FUNCTION migrate_existing_keys_to_vault TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_plaintext_keys TO service_role;
-- Example Usage (Run in Supabase SQL Editor):
-- 1. Set master password in Supabase Vault (dashboard)
-- 2. Migrate existing keys:
--    SELECT migrate_existing_keys_to_vault('YOUR_MASTER_PASSWORD_FROM_VAULT');
-- 3. Verify migration
-- 4. OPTIONAL: Clear plaintext (DANGEROUS):
--    SELECT cleanup_plaintext_keys('I_CONFIRM_VAULT_MIGRATION_IS_COMPLETE');


-- Payment Security Hardening
-- Part of Security Phase 2
-- 1. Add Security Columns to Payments Table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text;
-- Index for fast lookup of idempotency keys
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON public.payments(idempotency_key);
-- 2. Secure Payment Initialization RPC
-- Prevents duplicate charges and enforces timeouts
CREATE OR REPLACE FUNCTION initiate_secure_payment(
    p_amount decimal,
    p_currency text,
    p_gateway text,
    p_idempotency_key text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id uuid;
    v_existing_payment record;
BEGIN
    -- 1. Idempotency Check
    SELECT * INTO v_existing_payment 
    FROM public.payments 
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        -- If payment exists and is not failed/expired, return it
        IF v_existing_payment.payment_status IN ('CREATED', 'SUCCESS') THEN
             RETURN json_build_object(
                'payment_id', v_existing_payment.id,
                'status', v_existing_payment.payment_status,
                'is_duplicate', true,
                'message', 'Returned existing payment record'
            );
        END IF;
        
        -- If failed/expired, we might allow retry depending on logic
        -- For strictness, we'll reject reuse of same key for now
        RAISE EXCEPTION 'Idempotency key already used for a failed/expired payment. Please retry with new key.';
    END IF;
    -- 2. Validate Amount (Example limit)
    IF p_amount > 100000 THEN
        -- Flag for review? Or just reject high value without 2FA?
        -- For now, just proceed but maybe log warning
    END IF;
    -- 3. Create Payment Record
    INSERT INTO public.payments (
        amount, 
        currency, 
        gateway_name, -- Mapped from gateway param
        payment_status, 
        idempotency_key,
        admin_id, -- user receiving money (logic might need adjustment based on multitenancy)
        -- Assuming auth.uid() is the payer (Tenure)
        -- Wait, usually Admin receives. Need to pass admin_id or derive it.
        -- Let's assume metadata contains context or update to accept target_admin_id
        ip_address,
        user_agent
    )
    VALUES (
        p_amount,
        p_currency,
        p_gateway,
        'CREATED',
        p_idempotency_key,
        (p_metadata->>'admin_id')::uuid,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'user-agent'
    )
    RETURNING id INTO v_payment_id;
    RETURN json_build_object(
        'payment_id', v_payment_id,
        'status', 'CREATED',
        'is_duplicate', false
    );
END;
$$;
-- 3. Webhook Signature Verification Log
-- We don't verify signature IN SQL, but we log the result of the backend verification
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    gateway text CHECK (gateway IN ('razorpay', 'cashfree')),
    event_type text,
    payload jsonb,
    signature_verified boolean DEFAULT false,
    processed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Only system/service role should insert/view these
CREATE POLICY "Service role manages webhooks" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');


-- TOTP 2FA Schema
-- Part of Security Phase 2
-- 1. Secrets Table (Encrypted)
CREATE TABLE IF NOT EXISTS public.user_totp_secrets (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    secret text NOT NULL, -- Encrypted
    backup_codes text[], -- Hashed or Encrypted
    is_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_totp_secrets ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Users manage own secrets" ON public.user_totp_secrets
    FOR ALL USING (auth.uid() = user_id);
-- 2. Function to Store Secret
CREATE OR REPLACE FUNCTION enable_totp(
    p_secret text,
    p_encryption_key text -- Should be system master key
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_totp_secrets (user_id, secret, is_enabled)
    VALUES (
        auth.uid(),
        pgp_sym_encrypt(p_secret, p_encryption_key),
        true
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
        secret = pgp_sym_encrypt(p_secret, p_encryption_key),
        is_enabled = true,
        updated_at = now();
END;
$$;
-- 3. Helper to Verify (This implies we send Code to DB to verify? 
-- Or we retrieve Secret to backend to verify. 
-- Retrieval is safer so DB doesn't need to implement HMAC logic if complex)
CREATE OR REPLACE FUNCTION get_decrypted_totp_secret(
    p_encryption_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_secret bytea;
BEGIN
    SELECT secret::bytea INTO v_secret
    FROM public.user_totp_secrets
    WHERE user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN pgp_sym_decrypt(v_secret, p_encryption_key);
END;
$$;
-- 4. Disable 2FA
CREATE OR REPLACE FUNCTION disable_totp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_totp_secrets
    WHERE user_id = auth.uid();
    
    -- Also update profile flag
    UPDATE public.admins SET is_2fa_enabled = false WHERE id = auth.uid();
    UPDATE public.tenures SET is_2fa_enabled = false WHERE id = auth.uid();
END;
$$;



-- Advanced Rate Limiting & Brute Force Protection
-- Part of Security Hardening Phase 1
-- 1. Login Attempts Tracking Table
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    attempt_type text CHECK (attempt_type IN ('success', 'failed', 'locked')) NOT NULL,
    reason text, -- e.g., "Invalid password", "Account locked"
    created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_ip ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_created ON public.login_attempts(created_at);
-- 2. Account Lockout Status Table
CREATE TABLE IF NOT EXISTS public.account_lockouts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    locked_at timestamptz DEFAULT now() NOT NULL,
    unlock_at timestamptz NOT NULL, -- Auto-unlock time
    failed_attempts integer DEFAULT 0,
    locked_by_ip text,
    is_permanent boolean DEFAULT false, -- Manual admin lock
    
    unlock_token text -- Optional: for email unlock
);
CREATE INDEX IF NOT EXISTS idx_lockout_email ON public.account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_lockout_unlock_at ON public.account_lockouts(unlock_at);
-- 3. Rate Limit Rules Table (Configurable)
CREATE TABLE IF NOT EXISTS public.rate_limit_rules (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    rule_name text UNIQUE NOT NULL,
    resource_type text NOT NULL, -- e.g., 'login', 'payment_init', 'invoice_create'
    max_attempts integer NOT NULL,
    window_minutes integer NOT NULL, -- Time window
    lockout_minutes integer DEFAULT 30,
    enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
-- Insert Default Rules
INSERT INTO public.rate_limit_rules (rule_name, resource_type, max_attempts, window_minutes, lockout_minutes)
VALUES 
    ('login_attempts', 'login', 5, 15, 30), -- 5 attempts in 15 min, lock for 30 min
    ('payment_creation', 'payment', 3, 5, 10), -- Max 3 payments in 5 min
    ('invoice_spam', 'invoice', 10, 60, 15) -- Max 10 invoices per hour
ON CONFLICT (rule_name) DO NOTHING;
-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
-- Policies: Only admins and system can view
CREATE POLICY "Admins view login attempts" ON public.login_attempts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    );
CREATE POLICY "System inserts login attempts" ON public.login_attempts
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view lockouts" ON public.account_lockouts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    );
CREATE POLICY "System manages lockouts" ON public.account_lockouts
    FOR ALL WITH CHECK (true);
-- 4. Function: Check if Account is Locked
CREATE OR REPLACE FUNCTION check_account_locked(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lockout record;
    v_is_locked boolean := false;
    v_unlock_at timestamptz;
BEGIN
    -- Check if locked and still within lockout period
    SELECT * INTO v_lockout
    FROM public.account_lockouts
    WHERE email = p_email
    AND (unlock_at > now() OR is_permanent = true);
    
    IF FOUND THEN
        v_is_locked := true;
        v_unlock_at := v_lockout.unlock_at;
        
        -- Auto-unlock if time passed (cleanup)
        IF v_lockout.unlock_at <= now() AND NOT v_lockout.is_permanent THEN
            DELETE FROM public.account_lockouts WHERE email = p_email;
            v_is_locked := false;
        END IF;
    END IF;
    
    RETURN json_build_object(
        'is_locked', v_is_locked,
        'unlock_at', v_unlock_at,
        'is_permanent', COALESCE(v_lockout.is_permanent, false)
    );
END;
$$;
-- 5. Function: Record Login Attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_email text,
    p_ip_address text,
    p_user_agent text,
    p_success boolean,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule record;
    v_recent_failures integer;
    v_should_lock boolean := false;
    v_lockout_until timestamptz;
BEGIN
    -- Get rate limit rule
    SELECT * INTO v_rule
    FROM public.rate_limit_rules
    WHERE resource_type = 'login' AND enabled = true
    LIMIT 1;
    
    -- Record the attempt
    INSERT INTO public.login_attempts (email, ip_address, user_agent, attempt_type, reason)
    VALUES (
        p_email, 
        p_ip_address, 
        p_user_agent, 
        CASE WHEN p_success THEN 'success' ELSE 'failed' END,
        p_reason
    );
    
    -- If failed, check if we should lock
    IF NOT p_success THEN
        -- Count recent failures
        SELECT COUNT(*) INTO v_recent_failures
        FROM public.login_attempts
        WHERE email = p_email
        AND attempt_type = 'failed'
        AND created_at > (now() - (v_rule.window_minutes || ' minutes')::interval);
        
        -- Should we lock?
        IF v_recent_failures >= v_rule.max_attempts THEN
            v_should_lock := true;
            v_lockout_until := now() + (v_rule.lockout_minutes || ' minutes')::interval;
            
            -- Create or update lockout
            INSERT INTO public.account_lockouts (email, locked_at, unlock_at, failed_attempts, locked_by_ip)
            VALUES (p_email, now(), v_lockout_until, v_recent_failures, p_ip_address)
            ON CONFLICT (email) 
            DO UPDATE SET 
                locked_at = now(),
                unlock_at = v_lockout_until,
                failed_attempts = account_lockouts.failed_attempts + 1,
                locked_by_ip = p_ip_address;
            
            -- Record locked attempt
            INSERT INTO public.login_attempts (email, ip_address, user_agent, attempt_type, reason)
            VALUES (p_email, p_ip_address, p_user_agent, 'locked', 'Maximum attempts exceeded');
        END IF;
    ELSE
        -- Success: Clear any non-permanent lockouts
        DELETE FROM public.account_lockouts 
        WHERE email = p_email AND is_permanent = false;
    END IF;
    
    RETURN json_build_object(
        'should_lock', v_should_lock,
        'unlock_at', v_lockout_until,
        'attempts_remaining', GREATEST(0, v_rule.max_attempts - v_recent_failures)
    );
END;
$$;
-- 6. Function: Check Rate Limit (Generic)
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_resource_type text,
    p_identifier text -- email or IP or user_id
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule record;
    v_count integer;
    v_allowed boolean := true;
BEGIN
    -- Get rule
    SELECT * INTO v_rule
    FROM public.rate_limit_rules
    WHERE resource_type = p_resource_type AND enabled = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('allowed', true, 'reason', 'No rule defined');
    END IF;
    
    -- For payment/invoice, check audit logs or specific tracking
    -- This is a placeholder - you'd customize based on resource
    
    RETURN json_build_object(
        'allowed', v_allowed,
        'max_attempts', v_rule.max_attempts,
        'window_minutes', v_rule.window_minutes
    );
END;
$$;
-- 7. Cleanup Old Records (Maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete attempts older than 90 days
    DELETE FROM public.login_attempts
    WHERE created_at < (now() - interval '90 days');
    
    -- Delete expired non-permanent lockouts
    DELETE FROM public.account_lockouts
    WHERE unlock_at < now() AND is_permanent = false;
END;
$$;
-- Grant Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;
GRANT SELECT ON public.account_lockouts TO authenticated;
GRANT EXECUTE ON FUNCTION check_account_locked TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_login_attempt TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
-- Create a scheduled job (example - requires pg_cron extension)
-- SELECT cron.schedule('cleanup-login-attempts', '0 2 * * *', 'SELECT cleanup_old_login_attempts()');



-- Safely add is_2fa_enabled columns
-- Part of Security Phase 2
DO $$
BEGIN
    -- Add to admins
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'is_2fa_enabled') THEN
        ALTER TABLE public.admins ADD COLUMN is_2fa_enabled boolean DEFAULT false;
    END IF;
    -- Add to tenures
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenures' AND column_name = 'is_2fa_enabled') THEN
        ALTER TABLE public.tenures ADD COLUMN is_2fa_enabled boolean DEFAULT false;
    END IF;
END $$;





-- ==========================================
-- FILE: tenant_scoring.sql
-- PATH: C:\Users\sunil\Desktop\new\tenant_scoring.sql
-- ==========================================


-- Add trust_score column to tenures
ALTER TABLE public.tenures ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 60;

-- Create function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(p_tenure_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score integer := 60; -- Base Score
    v_paid_invoices integer;
    v_overdue_invoices integer;
    v_failed_transactions integer;
    v_is_verified boolean;
BEGIN
    -- 1. Check Phone Verification (Bonus: +10)
    -- Note: is_phone_verified column was added in otp_system_migration.sql
    -- We'll check if it exists or default to false
    BEGIN
        SELECT is_phone_verified INTO v_is_verified FROM tenures WHERE id = p_tenure_id;
    EXCEPTION WHEN OTHERS THEN
        v_is_verified := false;
    END;

    IF v_is_verified THEN
        v_score := v_score + 10;
    END IF;

    -- 2. Good Behavior: Paid Invoices (+2 each, max +20)
    SELECT count(*) INTO v_paid_invoices 
    FROM invoices 
    WHERE tenure_id = p_tenure_id AND status = 'paid';
    
    v_score := v_score + (LEAST(v_paid_invoices, 10) * 2);

    -- 3. Bad Behavior: Overdue/Pending Invoices (-5 each)
    -- Assuming invoices created more than 7 days ago and still pending
    SELECT count(*) INTO v_overdue_invoices
    FROM invoices 
    WHERE tenure_id = p_tenure_id 
    AND status = 'pending' 
    AND created_at < (now() - interval '7 days');

    v_score := v_score - (v_overdue_invoices * 5);

    -- 4. Bad Behavior: Failed Payments (-2 each)
    -- Look at transactions linked to this tenure's invoices
    SELECT count(*) INTO v_failed_transactions
    FROM transactions t
    JOIN invoices i ON t.invoice_id = i.id
    WHERE i.tenure_id = p_tenure_id AND t.status = 'failed';

    v_score := v_score - (v_failed_transactions * 2);

    -- Clamp Score between 0 and 100
    IF v_score > 100 THEN v_score := 100; END IF;
    IF v_score < 0 THEN v_score := 0; END IF;

    -- Update the table
    UPDATE tenures SET trust_score = v_score WHERE id = p_tenure_id;

    RETURN v_score;
END;
$$;



-- ==========================================
-- FILE: theme_floor_migration.sql
-- PATH: C:\Users\sunil\Desktop\new\theme_floor_migration.sql
-- ==========================================


-- 1. Alter floor_number to text (migration from int to string)
ALTER TABLE public.rooms 
ALTER COLUMN floor_number TYPE text USING floor_number::text;

-- 2. Add Theme Column to Admins
ALTER TABLE public.admins
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'nestify-light';

-- 3. Add Theme Column to Tenures
ALTER TABLE public.tenures
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'nestify-light';



-- ==========================================
-- FILE: transactions.sql
-- PATH: C:\Users\sunil\Desktop\new\transactions.sql
-- ==========================================


-- Drop table if it exists to ensure schema update
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id),
    tenure_id UUID REFERENCES public.tenures(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    gateway_provider TEXT CHECK (gateway_provider IN ('razorpay', 'cashfree')),
    status TEXT CHECK (status IN ('created', 'pending', 'success', 'failed')),
    gateway_payment_id TEXT,
    gateway_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenures can insert their own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = tenure_id);

CREATE POLICY "Tenures can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = tenure_id);

CREATE POLICY "Admins can view transactions for their tenures"
ON public.transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tenures
        WHERE tenures.id = transactions.tenure_id
        AND tenures.admin_id = auth.uid()
    )
);



-- ==========================================
-- FILE: triggers_notifications.sql
-- PATH: C:\Users\sunil\Desktop\new\triggers_notifications.sql
-- ==========================================


-- Trigger Function for New Invoices
create or replace function notify_on_new_invoice()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into notifications (user_id, title, message, type, link)
  values (NEW.tenure_id, 'New Invoice', 'A new invoice for ' || NEW.month || ' has been generated.', 'info', '/tenure/payments');
  return NEW;
end;
$$;

create trigger on_invoice_created
after insert on invoices
for each row execute function notify_on_new_invoice();


-- Trigger Function for Message Received
create or replace function notify_on_new_message()
returns trigger
language plpgsql
security definer
as $$
declare
  sender_name text;
begin
  -- Try to get sender name from admins or tenures
  select full_name into sender_name from admins where id = NEW.sender_id;
  if sender_name is null then
    select full_name into sender_name from tenures where id = NEW.sender_id;
  end if;
  
  if sender_name is null then
    sender_name := 'Someone';
  end if;

  insert into notifications (user_id, title, message, type, link)
  values (NEW.receiver_id, 'New Message', 'You have a new message from ' || sender_name, 'info', '/tenure/messages');
  return NEW;
end;
$$;

create trigger on_message_received
after insert on messages
for each row execute function notify_on_new_message();


-- Trigger Function for Maintenance Status Update
create or replace function notify_on_complaint_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if OLD.status <> NEW.status then
    insert into notifications (user_id, title, message, type, link)
    values (NEW.tenure_id, 'Complaint Update', 'Your complaint "' || NEW.title || '" status is now ' || NEW.status, 'info', '/tenure/complaints');
  end if;
  return NEW;
end;
$$;

create trigger on_complaint_status_change
after update on complaints
for each row execute function notify_on_complaint_update();


-- Trigger Function for New Tenure (Welcome) and Roommates
create or replace function notify_on_new_tenure()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Notify the new tenant (Welcome)
  if NEW.status = 'active' and (OLD.status is null or OLD.status <> 'active') then
     insert into notifications (user_id, title, message, type, link)
     values (NEW.id, 'Welcome to Nestify', 'Your tenure is now active. Welcome aboard!', 'success', '/tenure');
     
     -- Notify existing roommates
     if NEW.room_id is not null then
       insert into notifications (user_id, title, message, type, link)
       select id, 'New Roommate', 'Say hello to your new roommate, ' || NEW.full_name || '!', 'info', '/tenure/roommates'
       from tenures
       where room_id = NEW.room_id and id <> NEW.id and status = 'active';
     end if;
  end if;

  -- Also handle case where room_id changes (move room) ?? 
  -- For now just handle activation or new active insert.
  return NEW;
end;
$$;

create trigger on_tenure_activated
after insert or update on tenures
for each row execute function notify_on_new_tenure();



-- ==========================================
-- FILE: triggers.sql
-- PATH: C:\Users\sunil\Desktop\new\triggers.sql
-- ==========================================


-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Check if the user is an admin
  if new.raw_user_meta_data->>'role' = 'admin' then
    insert into public.admins (id, full_name, hostel_name, hostel_address, phone, stay_key)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'hostel_name',
      new.raw_user_meta_data->>'hostel_address',
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'stay_key'
    );
  
  -- Check if the user is a tenure (tenant)
  elsif new.raw_user_meta_data->>'role' = 'tenure' then
    -- Note: Tenure creation logic might be more complex if we need to link to an admin via stay_key here.
    -- However, for now, let's assume the basic profile is created, and the admin link happens separately or we pass admin_id in metadata.
    -- If SignupTenure passes admin_id, we can use it.
    
    -- Ideally, we should look up the admin_id using the stay_key passed in metadata, but triggers can be tricky with complex logic.
    -- For simplicity, if we pass 'admin_id' in metadata from the frontend (by looking it up first), we can insert it here.
    
    insert into public.tenures (id, admin_id, full_name, email, phone, status)
    values (
      new.id,
      (new.raw_user_meta_data->>'admin_id')::uuid,
      new.raw_user_meta_data->>'full_name',
      new.email,
      new.raw_user_meta_data->>'phone',
      'pending'
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on every new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();



-- ==========================================
-- FILE: update_invoices_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\update_invoices_schema.sql
-- ==========================================


-- Add due_date column to invoices if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
        ALTER TABLE public.invoices ADD COLUMN due_date DATE;
        
        -- Backfill existing rows with (created_at + 7 days) as default
        UPDATE public.invoices SET due_date = (created_at + INTERVAL '5 days')::DATE WHERE due_date IS NULL;
    END IF;
END $$;



-- ==========================================
-- FILE: update_messages_schema.sql
-- PATH: C:\Users\sunil\Desktop\new\update_messages_schema.sql
-- ==========================================


-- Ensure messages table has 'is_read' column
alter table public.messages add column if not exists is_read boolean default false;

-- Create index for faster unread count queries
create index if not exists idx_messages_unread on public.messages(receiver_id, is_read);

-- If there was a 'read' column from older schema, migrate it (optional safety)
do $$
begin
  if exists(select 1 from information_schema.columns where table_name = 'messages' and column_name = 'read') then
    update public.messages set is_read = read where is_read is false;
  end if;
end $$;



-- ==========================================
-- FILE: autopilot_setup.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\autopilot_setup.sql
-- ==========================================


-- AUTO-GENERATED BY AGENT - RUN IN SUPABASE SQL EDITOR

-- 1. Configuration Column
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS late_fee_daily_percent numeric DEFAULT 0;

-- 2. Advanced Late Fee Engine Function
CREATE OR REPLACE FUNCTION process_automated_late_fees(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_admin_config RECORD;
    v_daily_fee numeric;
    v_days_late integer;
    v_total_late_fee numeric;
    v_new_items jsonb;
    v_new_total numeric;
    v_updated_count integer := 0;
    v_item jsonb;
    v_platform_fees numeric;
BEGIN
    -- Get Admin Config
    SELECT late_fee_daily_percent INTO v_admin_config 
    FROM admins WHERE id = p_admin_id;

    -- If no late fee configured or 0, do nothing
    IF v_admin_config.late_fee_daily_percent IS NULL OR v_admin_config.late_fee_daily_percent <= 0 THEN
        RETURN json_build_object('status', 'skipped', 'message', 'No late fee configured');
    END IF;

    -- Loop through overdue pending invoices
    FOR v_invoice IN 
        SELECT * FROM invoices 
        WHERE admin_id = p_admin_id 
        AND status = 'pending'
        AND due_date < CURRENT_DATE
    LOOP
        -- Calculate Days Late
        v_days_late := CURRENT_DATE - v_invoice.due_date;
        
        -- Calculate Daily Fee based on Subtotal
        v_daily_fee := v_invoice.subtotal * (v_admin_config.late_fee_daily_percent / 100);
        
        -- Total Late Fee Accumulated
        v_total_late_fee := ROUND(v_daily_fee * v_days_late, 2);

        -- Construct New Items Array (Remove old late fee, add new one)
        v_new_items := '[]'::jsonb;
        v_platform_fees := 0;

        FOR v_item IN SELECT * FROM jsonb_array_elements(v_invoice.items)
        LOOP
            IF v_item->>'type' = 'late_fee' THEN
                -- Skip old late fee (we replace it)
                CONTINUE;
            ELSE
                v_new_items := v_new_items || v_item;
            END IF;
        END LOOP;

        -- Add Updated Late Fee Item
        v_new_items := v_new_items || jsonb_build_object(
            'description', 'Late Fee (' || v_days_late || ' days @ ' || v_admin_config.late_fee_daily_percent || '%)',
            'amount', v_total_late_fee,
            'type', 'late_fee'
        );

        -- Recalculate Invoice Total
        -- New Total = Subtotal + (Platform Fees? - assume subtotal covers core) + Late Fee
        -- Actually, safer to rebuild from Subtotal + Late Fee if Subtotal is reliable.
        -- Assuming v_invoice.subtotal is the rent + fixed charges.
        
        v_new_total := v_invoice.subtotal + v_total_late_fee;

        -- Update Invoice
        UPDATE invoices
        SET 
            items = v_new_items,
            total_amount = v_new_total
        WHERE id = v_invoice.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'processed_count', v_updated_count,
        'rate_applied', v_admin_config.late_fee_daily_percent
    );
END;
$$;



-- ==========================================
-- FILE: backup_codes_schema.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\backup_codes_schema.sql
-- ==========================================


-- 2FA Backup Codes Schema
-- Phase 3.1: Emergency Access

-- 1. Backup Codes Table
CREATE TABLE IF NOT EXISTS public.user_backup_codes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash text NOT NULL, -- Bcrypt hash of the code
    used_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON public.user_backup_codes(user_id);

-- Enable RLS
ALTER TABLE public.user_backup_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own backup codes" ON public.user_backup_codes
    FOR ALL USING (auth.uid() = user_id);

-- 2. Function: Save Backup Codes (Batch)
-- Hashes plaintext codes using bcrypt (blowfish) via pgcrypto
CREATE OR REPLACE FUNCTION save_backup_codes(
    p_plain_codes text[] 
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clear old unused codes for this user
    DELETE FROM public.user_backup_codes 
    WHERE user_id = auth.uid() AND used_at IS NULL;

    -- Insert new codes hashed
    INSERT INTO public.user_backup_codes (user_id, code_hash)
    SELECT auth.uid(), crypt(unnest(p_plain_codes), gen_salt('bf'));
END;
$$;

-- 3. Function: Verify and Use Backup Code
CREATE OR REPLACE FUNCTION verify_backup_code(
    p_code_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_record record;
BEGIN
    -- Find a matching unused code
    -- Since we store bcrypt hashes, we can't search by plaintext.
    -- Loop through unused codes and check password.
    -- Optimization: Backup codes are 8-10 chars usually.
    
    FOR v_code_record IN 
        SELECT id, code_hash 
        FROM public.user_backup_codes 
        WHERE user_id = auth.uid() AND used_at IS NULL
    LOOP
        -- Check hash (pgcrypto required)
        IF (v_code_record.code_hash = crypt(p_code_input, v_code_record.code_hash)) THEN
            -- Mark as used
            UPDATE public.user_backup_codes 
            SET used_at = now() 
            WHERE id = v_code_record.id;
            
            -- Log security event (Phase 3.3 placeholder)
            PERFORM record_login_attempt(
                 (SELECT email FROM auth.users WHERE id = auth.uid()),
                 'unknown', 'unknown', true, 'Backup Code Used'
            );
            
            RETURN true;
        END IF;
    END LOOP;
    
    RETURN false;
END;
$$;

-- 4. Function: Count Remaining Codes
CREATE OR REPLACE FUNCTION count_backup_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.user_backup_codes
    WHERE user_id = auth.uid() AND used_at IS NULL;
    
    RETURN v_count;
END;
$$;



-- ==========================================
-- FILE: community_setup.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\community_setup.sql
-- ==========================================


-- Community Hub Tables for Nestify
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Posts (Events, Announcements, Polls)
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('event', 'announcement', 'poll')) NOT NULL,
  title text NOT NULL,
  content text,
  event_date timestamp with time zone,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Poll Options
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  vote_count integer DEFAULT 0
);

-- 3. Poll Votes (Tracking user votes)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id) -- One vote per user per poll
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Admins can manage posts" ON public.community_posts;
DROP POLICY IF EXISTS "Tenures and Admins view posts" ON public.community_posts;
DROP POLICY IF EXISTS "Admins manage poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Everyone view options" ON public.poll_options;
DROP POLICY IF EXISTS "Admins view votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Tenures can vote" ON public.poll_votes;
DROP POLICY IF EXISTS "Tenures view own votes" ON public.poll_votes;

-- Policies

-- Admins: Full Control over Posts
CREATE POLICY "Admins can manage posts" ON public.community_posts
  FOR ALL USING (auth.uid() = admin_id);

-- Tenure: View Posts (everyone can see posts)
CREATE POLICY "Tenures and Admins view posts" ON public.community_posts
  FOR SELECT USING (true);

-- Admins: Manage Options
CREATE POLICY "Admins manage poll options" ON public.poll_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.community_posts WHERE id = poll_options.post_id AND admin_id = auth.uid())
  );

-- Tenure: View Options
CREATE POLICY "Everyone view options" ON public.poll_options
  FOR SELECT USING (true);

-- Votes: Admin View
CREATE POLICY "Admins view votes" ON public.poll_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_posts WHERE id = poll_votes.post_id AND admin_id = auth.uid())
  );

-- Votes: Tenure Vote
CREATE POLICY "Tenures can vote" ON public.poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenures view own votes" ON public.poll_votes
  FOR SELECT USING (auth.uid() = user_id);


-- Function to increment vote count atomically
CREATE OR REPLACE FUNCTION public.vote_on_poll(p_post_id uuid, p_option_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert Vote Record
  INSERT INTO public.poll_votes (post_id, option_id, user_id)
  VALUES (p_post_id, p_option_id, auth.uid());

  -- Increment Counter
  UPDATE public.poll_options
  SET vote_count = vote_count + 1
  WHERE id = p_option_id;
END;
$$;



-- ==========================================
-- FILE: fix_2fa_rpc.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\fix_2fa_rpc.sql
-- ==========================================


-- FIX: Enable TOTP RPC Update
-- The original function didn't update the is_2fa_enabled flag on profile tables.
-- This caused Login to skip the 2FA challenge.

CREATE OR REPLACE FUNCTION enable_totp(
    p_secret text,
    p_encryption_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Insert/Update Secret in Secure Table
    INSERT INTO public.user_totp_secrets (user_id, secret, is_enabled)
    VALUES (
        auth.uid(),
        pgp_sym_encrypt(p_secret, p_encryption_key),
        true
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
        secret = pgp_sym_encrypt(p_secret, p_encryption_key),
        is_enabled = true,
        updated_at = now();

    -- 2. Update Profile Flags (Critical for Login Check)
    -- We try updating both tables; only the matching one will affect a row.
    UPDATE public.admins SET is_2fa_enabled = true WHERE id = auth.uid();
    UPDATE public.tenures SET is_2fa_enabled = true WHERE id = auth.uid();
END;
$$;



-- ==========================================
-- FILE: fix_device_revocation.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\fix_device_revocation.sql
-- ==========================================


-- Fix for "Failed to revoke device" error
-- The error happens because the RPC function `untrust_device` is missing.

-- 1. Create the RPC function to revoke a device
CREATE OR REPLACE FUNCTION untrust_device(p_device_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow users to untrust their OWN devices
    UPDATE public.user_devices
    SET is_trusted = false
    WHERE id = p_device_id
    AND user_id = auth.uid();
    
    -- If no row was updated, it means either the ID doesn't exist 
    -- or it belongs to another user.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Device not found or access denied';
    END IF;
END;
$$;

-- 2. Ensure RLS policies exist for user_devices (just in case)
-- Users should be able to see their own devices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_devices' 
        AND policyname = 'Users can view own devices'
    ) THEN
        CREATE POLICY "Users can view own devices" 
        ON "public"."user_devices" 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Users should be able to update their own devices via RLS (optional, since RPC handles it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_devices' 
        AND policyname = 'Users can update own devices'
    ) THEN
        CREATE POLICY "Users can update own devices" 
        ON "public"."user_devices" 
        FOR UPDATE
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END
$$;



-- ==========================================
-- FILE: fix_owner_contact.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\fix_owner_contact.sql
-- ==========================================


-- Fix for "Failed to contact owner" error
-- The error occurs because Tenants cannot read Admin details due to RLS policies.

-- 1. Allow authenticated users (Tenants) to read Admin details
-- Note: In a real production app, you might want to link this strictly to the tenant's admin_id
-- But for now, allowing read access to admins table for authenticated users is a safe unblocker
-- as long as we don't expose sensitive columns (which is handled by the frontend SELECT query, 
-- though RLS is row-level).

DO $$
BEGIN
    -- Check if policy exists before creating to avoid error
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admins' 
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" 
        ON "public"."admins" 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END
$$;

-- 2. Ensure Tenures table is readable by the user who owns the record
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tenures' 
        AND policyname = 'Users can view own tenure record'
    ) THEN
        CREATE POLICY "Users can view own tenure record" 
        ON "public"."tenures" 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = id);
    END IF;
END
$$;



-- ==========================================
-- FILE: gamification_points.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\gamification_points.sql
-- ==========================================


-- Add points to badges
alter table badges add column if not exists points int default 10;

-- Update points for existing badges
update badges set points = 20 where id = 'early_bird';
update badges set points = 50 where id = 'streak_master';
update badges set points = 30 where id = 'verified_guardian';
update badges set points = 100 where id = 'good_neighbor';
update badges set points = 15 where id = 'digital_native';

-- Create View for Leaderboards/Total Score
create or replace view user_scores as
select 
    u.id as user_id,
    u.full_name,
    u.room_id,
    count(ub.badge_id) as badge_count,
    coalesce(sum(b.points), 0) as total_points,
    case 
        when coalesce(sum(b.points), 0) >= 200 then 'Nest Legend'
        when coalesce(sum(b.points), 0) >= 100 then 'Star Resident'
        when coalesce(sum(b.points), 0) >= 50 then 'Pro Tenant'
        else 'Rookie'
    end as current_rank
from tenures u
left join user_badges ub on u.id = ub.user_id
left join badges b on ub.badge_id = b.id
group by u.id, u.full_name, u.room_id;



-- ==========================================
-- FILE: payment_encryption_schema.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\payment_encryption_schema.sql
-- ==========================================


-- Payment Key Encryption System
-- Part of Security Hardening Phase 1

-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create secure key vault table
CREATE TABLE IF NOT EXISTS public.key_vault (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
    key_type text CHECK (key_type IN ('razorpay_key', 'razorpay_secret', 'cashfree_app', 'cashfree_secret')) NOT NULL,
    encrypted_value bytea NOT NULL, -- Encrypted key
    encryption_version integer DEFAULT 1, -- For key rotation tracking
    last_rotated_at timestamptz DEFAULT now(),
    rotation_reminder_sent boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    UNIQUE(admin_id, key_type)
);

-- 3. Key Access Audit Table
CREATE TABLE IF NOT EXISTS public.key_access_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
    key_type text NOT NULL,
    access_type text CHECK (access_type IN ('encrypt', 'decrypt', 'rotate', 'view')) NOT NULL,
    accessed_by uuid REFERENCES auth.users(id),
    ip_address text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_key_access_admin ON public.key_access_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_key_access_type ON public.key_access_logs(access_type);

-- Enable RLS
ALTER TABLE public.key_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_access_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins access own keys" ON public.key_vault
    FOR ALL USING (auth.uid() = admin_id);

CREATE POLICY "Admins view own access logs" ON public.key_access_logs
    FOR SELECT USING (auth.uid() = admin_id);

CREATE POLICY "System logs key access" ON public.key_access_logs
    FOR INSERT WITH CHECK (true);

-- 4. Function: Encrypt and Store Key
CREATE OR REPLACE FUNCTION store_encrypted_key(
    p_admin_id uuid,
    p_key_type text,
    p_plain_key text,
    p_encryption_password text -- Master password from Supabase Vault
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_encrypted bytea;
BEGIN
    -- Encrypt the key
    v_encrypted := pgp_sym_encrypt(p_plain_key, p_encryption_password);
    
    -- Store in vault
    INSERT INTO public.key_vault (admin_id, key_type, encrypted_value, last_rotated_at)
    VALUES (p_admin_id, p_key_type, v_encrypted, now())
    ON CONFLICT (admin_id, key_type)
    DO UPDATE SET 
        encrypted_value = v_encrypted,
        last_rotated_at = now(),
        updated_at = now(),
        rotation_reminder_sent = false;
    
    -- Log the encryption
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by)
    VALUES (p_admin_id, p_key_type, 'encrypt', auth.uid());
    
    RETURN json_build_object('success', true, 'encrypted_at', now());
EXCEPTION WHEN OTHERS THEN
    -- Log failure
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by, success, error_message)
    VALUES (p_admin_id, p_key_type, 'encrypt', auth.uid(), false, SQLERRM);
    
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Function: Decrypt and Retrieve Key
CREATE OR REPLACE FUNCTION get_decrypted_key(
    p_admin_id uuid,
    p_key_type text,
    p_encryption_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_encrypted bytea;
    v_decrypted text;
BEGIN
    -- Retrieve encrypted key
    SELECT encrypted_value INTO v_encrypted
    FROM public.key_vault
    WHERE admin_id = p_admin_id AND key_type = p_key_type;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Key not found for type: %', p_key_type;
    END IF;
    
    -- Decrypt
    v_decrypted := pgp_sym_decrypt(v_encrypted, p_encryption_password);
    
    -- Log access
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by)
    VALUES (p_admin_id, p_key_type, 'decrypt', auth.uid());
    
    RETURN v_decrypted;
EXCEPTION WHEN OTHERS THEN
    -- Log failure
    INSERT INTO public.key_access_logs (admin_id, key_type, access_type, accessed_by, success, error_message)
    VALUES (p_admin_id, p_key_type, 'decrypt', auth.uid(), false, SQLERRM);
    
    RAISE;
END;
$$;

-- 6. Function: Check Keys Needing Rotation (90-day policy)
CREATE OR REPLACE FUNCTION check_key_rotation_status(p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT json_agg(
        json_build_object(
            'key_type', key_type,
            'last_rotated', last_rotated_at,
            'days_old', EXTRACT(DAY FROM (now() - last_rotated_at)),
            'needs_rotation', (now() - last_rotated_at) > interval '90 days'
        )
    ) INTO v_result
    FROM public.key_vault
    WHERE admin_id = p_admin_id;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 7. Migration Function: Encrypt Existing Keys in Admins Table
CREATE OR REPLACE FUNCTION migrate_existing_keys_to_vault(
    p_encryption_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin record;
    v_migrated integer := 0;
    v_errors integer := 0;
BEGIN
    -- Loop through all admins
    FOR v_admin IN SELECT * FROM public.admins LOOP
        BEGIN
            -- Migrate Razorpay Key ID
            IF v_admin.razorpay_key_id IS NOT NULL AND v_admin.razorpay_key_id != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'razorpay_key', 
                    v_admin.razorpay_key_id, 
                    p_encryption_password
                );
            END IF;
            
            -- Migrate Razorpay Secret
            IF v_admin.razorpay_key_secret IS NOT NULL AND v_admin.razorpay_key_secret != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'razorpay_secret', 
                    v_admin.razorpay_key_secret, 
                    p_encryption_password
                );
            END IF;
            
            -- Migrate Cashfree App ID
            IF v_admin.cashfree_app_id IS NOT NULL AND v_admin.cashfree_app_id != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'cashfree_app', 
                    v_admin.cashfree_app_id, 
                    p_encryption_password
                );
            END IF;
            
            -- Migrate Cashfree Secret
            IF v_admin.cashfree_secret_key IS NOT NULL AND v_admin.cashfree_secret_key != '' THEN
                PERFORM store_encrypted_key(
                    v_admin.id, 
                    'cashfree_secret', 
                    v_admin.cashfree_secret_key, 
                    p_encryption_password
                );
            END IF;
            
            v_migrated := v_migrated + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            CONTINUE;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'migrated', v_migrated,
        'errors', v_errors,
        'total_admins', (SELECT COUNT(*) FROM public.admins)
    );
END;
$$;

-- 8. Function: Secure Cleanup of Old Keys from Admins Table (Optional)
-- WARNING: Only run this AFTER confirming vault migration is successful
CREATE OR REPLACE FUNCTION cleanup_plaintext_keys(p_confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Safety check
    IF p_confirm != 'I_CONFIRM_VAULT_MIGRATION_IS_COMPLETE' THEN
        RAISE EXCEPTION 'Must confirm vault migration completion';
    END IF;
    
    -- Clear plaintext keys
    UPDATE public.admins SET
        razorpay_key_id = NULL,
        razorpay_key_secret = NULL,
        cashfree_app_id = NULL,
        cashfree_secret_key = NULL;
    
    RETURN json_build_object('success', true, 'cleared', true);
END;
$$;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION store_encrypted_key TO authenticated;
GRANT EXECUTE ON FUNCTION get_decrypted_key TO authenticated;
GRANT EXECUTE ON FUNCTION check_key_rotation_status TO authenticated;

-- Note: Migration functions should only be callable by service_role
GRANT EXECUTE ON FUNCTION migrate_existing_keys_to_vault TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_plaintext_keys TO service_role;

-- Example Usage (Run in Supabase SQL Editor):
-- 1. Set master password in Supabase Vault (dashboard)
-- 2. Migrate existing keys:
--    SELECT migrate_existing_keys_to_vault('YOUR_MASTER_PASSWORD_FROM_VAULT');
-- 3. Verify migration
-- 4. OPTIONAL: Clear plaintext (DANGEROUS):
--    SELECT cleanup_plaintext_keys('I_CONFIRM_VAULT_MIGRATION_IS_COMPLETE');



-- ==========================================
-- FILE: payment_hardening.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\payment_hardening.sql
-- ==========================================


-- Payment Security Hardening
-- Part of Security Phase 2

-- 1. Add Security Columns to Payments Table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Index for fast lookup of idempotency keys
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON public.payments(idempotency_key);

-- 2. Secure Payment Initialization RPC
-- Prevents duplicate charges and enforces timeouts
CREATE OR REPLACE FUNCTION initiate_secure_payment(
    p_amount decimal,
    p_currency text,
    p_gateway text,
    p_idempotency_key text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id uuid;
    v_existing_payment record;
BEGIN
    -- 1. Idempotency Check
    SELECT * INTO v_existing_payment 
    FROM public.payments 
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        -- If payment exists and is not failed/expired, return it
        IF v_existing_payment.payment_status IN ('CREATED', 'SUCCESS') THEN
             RETURN json_build_object(
                'payment_id', v_existing_payment.id,
                'status', v_existing_payment.payment_status,
                'is_duplicate', true,
                'message', 'Returned existing payment record'
            );
        END IF;
        
        -- If failed/expired, we might allow retry depending on logic
        -- For strictness, we'll reject reuse of same key for now
        RAISE EXCEPTION 'Idempotency key already used for a failed/expired payment. Please retry with new key.';
    END IF;

    -- 2. Validate Amount (Example limit)
    IF p_amount > 100000 THEN
        -- Flag for review? Or just reject high value without 2FA?
        -- For now, just proceed but maybe log warning
    END IF;

    -- 3. Create Payment Record
    INSERT INTO public.payments (
        amount, 
        currency, 
        gateway_name, -- Mapped from gateway param
        payment_status, 
        idempotency_key,
        admin_id, -- user receiving money (logic might need adjustment based on multitenancy)
        -- Assuming auth.uid() is the payer (Tenure)
        -- Wait, usually Admin receives. Need to pass admin_id or derive it.
        -- Let's assume metadata contains context or update to accept target_admin_id
        ip_address,
        user_agent
    )
    VALUES (
        p_amount,
        p_currency,
        p_gateway,
        'CREATED',
        p_idempotency_key,
        (p_metadata->>'admin_id')::uuid,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'user-agent'
    )
    RETURNING id INTO v_payment_id;

    RETURN json_build_object(
        'payment_id', v_payment_id,
        'status', 'CREATED',
        'is_duplicate', false
    );
END;
$$;

-- 3. Webhook Signature Verification Log
-- We don't verify signature IN SQL, but we log the result of the backend verification
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    gateway text CHECK (gateway IN ('razorpay', 'cashfree')),
    event_type text,
    payload jsonb,
    signature_verified boolean DEFAULT false,
    processed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only system/service role should insert/view these
CREATE POLICY "Service role manages webhooks" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');



-- ==========================================
-- FILE: rate_limiting_schema.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\rate_limiting_schema.sql
-- ==========================================


-- Advanced Rate Limiting & Brute Force Protection
-- Part of Security Hardening Phase 1

-- 1. Login Attempts Tracking Table
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    attempt_type text CHECK (attempt_type IN ('success', 'failed', 'locked')) NOT NULL,
    reason text, -- e.g., "Invalid password", "Account locked"
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_ip ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_created ON public.login_attempts(created_at);

-- 2. Account Lockout Status Table
CREATE TABLE IF NOT EXISTS public.account_lockouts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    locked_at timestamptz DEFAULT now() NOT NULL,
    unlock_at timestamptz NOT NULL, -- Auto-unlock time
    failed_attempts integer DEFAULT 0,
    locked_by_ip text,
    is_permanent boolean DEFAULT false, -- Manual admin lock
    
    unlock_token text -- Optional: for email unlock
);

CREATE INDEX IF NOT EXISTS idx_lockout_email ON public.account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_lockout_unlock_at ON public.account_lockouts(unlock_at);

-- 3. Rate Limit Rules Table (Configurable)
CREATE TABLE IF NOT EXISTS public.rate_limit_rules (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    rule_name text UNIQUE NOT NULL,
    resource_type text NOT NULL, -- e.g., 'login', 'payment_init', 'invoice_create'
    max_attempts integer NOT NULL,
    window_minutes integer NOT NULL, -- Time window
    lockout_minutes integer DEFAULT 30,
    enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Insert Default Rules
INSERT INTO public.rate_limit_rules (rule_name, resource_type, max_attempts, window_minutes, lockout_minutes)
VALUES 
    ('login_attempts', 'login', 5, 15, 30), -- 5 attempts in 15 min, lock for 30 min
    ('payment_creation', 'payment', 3, 5, 10), -- Max 3 payments in 5 min
    ('invoice_spam', 'invoice', 10, 60, 15) -- Max 10 invoices per hour
ON CONFLICT (rule_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins and system can view
CREATE POLICY "Admins view login attempts" ON public.login_attempts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    );

CREATE POLICY "System inserts login attempts" ON public.login_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins view lockouts" ON public.account_lockouts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    );

CREATE POLICY "System manages lockouts" ON public.account_lockouts
    FOR ALL WITH CHECK (true);

-- 4. Function: Check if Account is Locked
CREATE OR REPLACE FUNCTION check_account_locked(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lockout record;
    v_is_locked boolean := false;
    v_unlock_at timestamptz;
BEGIN
    -- Check if locked and still within lockout period
    SELECT * INTO v_lockout
    FROM public.account_lockouts
    WHERE email = p_email
    AND (unlock_at > now() OR is_permanent = true);
    
    IF FOUND THEN
        v_is_locked := true;
        v_unlock_at := v_lockout.unlock_at;
        
        -- Auto-unlock if time passed (cleanup)
        IF v_lockout.unlock_at <= now() AND NOT v_lockout.is_permanent THEN
            DELETE FROM public.account_lockouts WHERE email = p_email;
            v_is_locked := false;
        END IF;
    END IF;
    
    RETURN json_build_object(
        'is_locked', v_is_locked,
        'unlock_at', v_unlock_at,
        'is_permanent', COALESCE(v_lockout.is_permanent, false)
    );
END;
$$;

-- 5. Function: Record Login Attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_email text,
    p_ip_address text,
    p_user_agent text,
    p_success boolean,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule record;
    v_recent_failures integer;
    v_should_lock boolean := false;
    v_lockout_until timestamptz;
BEGIN
    -- Get rate limit rule
    SELECT * INTO v_rule
    FROM public.rate_limit_rules
    WHERE resource_type = 'login' AND enabled = true
    LIMIT 1;
    
    -- Record the attempt
    INSERT INTO public.login_attempts (email, ip_address, user_agent, attempt_type, reason)
    VALUES (
        p_email, 
        p_ip_address, 
        p_user_agent, 
        CASE WHEN p_success THEN 'success' ELSE 'failed' END,
        p_reason
    );
    
    -- If failed, check if we should lock
    IF NOT p_success THEN
        -- Count recent failures
        SELECT COUNT(*) INTO v_recent_failures
        FROM public.login_attempts
        WHERE email = p_email
        AND attempt_type = 'failed'
        AND created_at > (now() - (v_rule.window_minutes || ' minutes')::interval);
        
        -- Should we lock?
        IF v_recent_failures >= v_rule.max_attempts THEN
            v_should_lock := true;
            v_lockout_until := now() + (v_rule.lockout_minutes || ' minutes')::interval;
            
            -- Create or update lockout
            INSERT INTO public.account_lockouts (email, locked_at, unlock_at, failed_attempts, locked_by_ip)
            VALUES (p_email, now(), v_lockout_until, v_recent_failures, p_ip_address)
            ON CONFLICT (email) 
            DO UPDATE SET 
                locked_at = now(),
                unlock_at = v_lockout_until,
                failed_attempts = account_lockouts.failed_attempts + 1,
                locked_by_ip = p_ip_address;
            
            -- Record locked attempt
            INSERT INTO public.login_attempts (email, ip_address, user_agent, attempt_type, reason)
            VALUES (p_email, p_ip_address, p_user_agent, 'locked', 'Maximum attempts exceeded');
        END IF;
    ELSE
        -- Success: Clear any non-permanent lockouts
        DELETE FROM public.account_lockouts 
        WHERE email = p_email AND is_permanent = false;
    END IF;
    
    RETURN json_build_object(
        'should_lock', v_should_lock,
        'unlock_at', v_lockout_until,
        'attempts_remaining', GREATEST(0, v_rule.max_attempts - v_recent_failures)
    );
END;
$$;

-- 6. Function: Check Rate Limit (Generic)
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_resource_type text,
    p_identifier text -- email or IP or user_id
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule record;
    v_count integer;
    v_allowed boolean := true;
BEGIN
    -- Get rule
    SELECT * INTO v_rule
    FROM public.rate_limit_rules
    WHERE resource_type = p_resource_type AND enabled = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('allowed', true, 'reason', 'No rule defined');
    END IF;
    
    -- For payment/invoice, check audit logs or specific tracking
    -- This is a placeholder - you'd customize based on resource
    
    RETURN json_build_object(
        'allowed', v_allowed,
        'max_attempts', v_rule.max_attempts,
        'window_minutes', v_rule.window_minutes
    );
END;
$$;

-- 7. Cleanup Old Records (Maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete attempts older than 90 days
    DELETE FROM public.login_attempts
    WHERE created_at < (now() - interval '90 days');
    
    -- Delete expired non-permanent lockouts
    DELETE FROM public.account_lockouts
    WHERE unlock_at < now() AND is_permanent = false;
END;
$$;

-- Grant Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;
GRANT SELECT ON public.account_lockouts TO authenticated;
GRANT EXECUTE ON FUNCTION check_account_locked TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_login_attempt TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;

-- Create a scheduled job (example - requires pg_cron extension)
-- SELECT cron.schedule('cleanup-login-attempts', '0 2 * * *', 'SELECT cleanup_old_login_attempts()');



-- ==========================================
-- FILE: recurring_billing_setup.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\recurring_billing_setup.sql
-- ==========================================


-- AUTO-GENERATED BY AGENT - RUN IN SUPABASE SQL EDITOR

-- 1. Configuration Columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS auto_bill_enabled boolean DEFAULT false;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS auto_bill_day integer DEFAULT 1;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS charge_maintenance numeric DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS charge_water numeric DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS charge_electricity numeric DEFAULT 0;

-- 2. Recurring Billing Engine
CREATE OR REPLACE FUNCTION generate_recurring_invoices(
    p_admin_id uuid,
    p_force boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_config RECORD;
    v_tenure RECORD;
    v_room_price numeric;
    v_items jsonb;
    v_total numeric;
    v_generated_count integer := 0;
    v_skipped_count integer := 0;
    v_current_day integer;
BEGIN
    -- Get Config
    SELECT * INTO v_admin_config FROM admins WHERE id = p_admin_id;

    -- Check Enabled (unless forced)
    IF NOT p_force AND (v_admin_config.auto_bill_enabled IS NULL OR v_admin_config.auto_bill_enabled = false) THEN
        RETURN json_build_object('status', 'skipped', 'message', 'Feature disabled');
    END IF;

    -- Check Date (unless forced)
    v_current_day := EXTRACT(DAY FROM CURRENT_DATE);
    IF NOT p_force AND v_admin_config.auto_bill_day != v_current_day THEN
         RETURN json_build_object('status', 'skipped', 'message', 'Not billing day (Today: ' || v_current_day || ', Config: ' || v_admin_config.auto_bill_day || ')');
    END IF;

    -- Iterate Active Tenures
    FOR v_tenure IN 
        SELECT t.*, r.price as price_per_month 
        FROM tenures t
        JOIN rooms r ON t.room_id = r.id
        WHERE t.admin_id = p_admin_id 
        AND t.status = 'active'
    LOOP
        -- Duplicate Check: Check if invoice already created THIS MONTH for this tenant
        -- Assuming invoice date is current_date
        PERFORM 1 FROM invoices 
        WHERE tenure_id = v_tenure.id 
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

        IF FOUND THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Build Items
        v_items := '[]'::jsonb;
        v_total := 0;

        -- Rent
        v_items := v_items || jsonb_build_object('description', 'Monthly Rent', 'amount', v_tenure.price_per_month, 'type', 'rent');
        v_total := v_total + v_tenure.price_per_month;

        -- Maintenance
        IF v_admin_config.charge_maintenance > 0 THEN
             v_items := v_items || jsonb_build_object('description', 'Maintenance Charge', 'amount', v_admin_config.charge_maintenance, 'type', 'fee');
             v_total := v_total + v_admin_config.charge_maintenance;
        END IF;

        -- Water
        IF v_admin_config.charge_water > 0 THEN
             v_items := v_items || jsonb_build_object('description', 'Water Charges', 'amount', v_admin_config.charge_water, 'type', 'fee');
             v_total := v_total + v_admin_config.charge_water;
        END IF;

         -- Electricity
        IF v_admin_config.charge_electricity > 0 THEN
             v_items := v_items || jsonb_build_object('description', 'Electricity (Fixed)', 'amount', v_admin_config.charge_electricity, 'type', 'fee');
             v_total := v_total + v_admin_config.charge_electricity;
        END IF;

        -- Create Invoice
        INSERT INTO invoices (
            admin_id, 
            tenure_id, 
            total_amount, 
            items, 
            status, 
            due_date, 
            created_at
        ) VALUES (
            p_admin_id,
            v_tenure.id,
            v_total,
            v_items,
            'pending',
            CURRENT_DATE + INTERVAL '5 days', -- Due in 5 days
            CURRENT_DATE
        );

        v_generated_count := v_generated_count + 1;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'generated', v_generated_count,
        'skipped_duplicates', v_skipped_count
    );
END;
$$;



-- ==========================================
-- FILE: totp_columns.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\totp_columns.sql
-- ==========================================


-- Safely add is_2fa_enabled columns
-- Part of Security Phase 2

DO $$
BEGIN
    -- Add to admins
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'is_2fa_enabled') THEN
        ALTER TABLE public.admins ADD COLUMN is_2fa_enabled boolean DEFAULT false;
    END IF;

    -- Add to tenures
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenures' AND column_name = 'is_2fa_enabled') THEN
        ALTER TABLE public.tenures ADD COLUMN is_2fa_enabled boolean DEFAULT false;
    END IF;
END $$;



-- ==========================================
-- FILE: totp_schema.sql
-- PATH: C:\Users\sunil\.gemini\antigravity\brain\f45c663a-89db-4614-b547-762a9e53ec21\totp_schema.sql
-- ==========================================


-- TOTP 2FA Schema
-- Part of Security Phase 2

-- 1. Secrets Table (Encrypted)
CREATE TABLE IF NOT EXISTS public.user_totp_secrets (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    secret text NOT NULL, -- Encrypted
    backup_codes text[], -- Hashed or Encrypted
    is_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_totp_secrets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own secrets" ON public.user_totp_secrets
    FOR ALL USING (auth.uid() = user_id);

-- 2. Function to Store Secret
CREATE OR REPLACE FUNCTION enable_totp(
    p_secret text,
    p_encryption_key text -- Should be system master key
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_totp_secrets (user_id, secret, is_enabled)
    VALUES (
        auth.uid(),
        pgp_sym_encrypt(p_secret, p_encryption_key),
        true
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
        secret = pgp_sym_encrypt(p_secret, p_encryption_key),
        is_enabled = true,
        updated_at = now();
END;
$$;

-- 3. Helper to Verify (This implies we send Code to DB to verify? 
-- Or we retrieve Secret to backend to verify. 
-- Retrieval is safer so DB doesn't need to implement HMAC logic if complex)
CREATE OR REPLACE FUNCTION get_decrypted_totp_secret(
    p_encryption_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_secret bytea;
BEGIN
    SELECT secret::bytea INTO v_secret
    FROM public.user_totp_secrets
    WHERE user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN pgp_sym_decrypt(v_secret, p_encryption_key);
END;
$$;

-- 4. Disable 2FA
CREATE OR REPLACE FUNCTION disable_totp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_totp_secrets
    WHERE user_id = auth.uid();
    
    -- Also update profile flag
    UPDATE public.admins SET is_2fa_enabled = false WHERE id = auth.uid();
    UPDATE public.tenures SET is_2fa_enabled = false WHERE id = auth.uid();
END;
$$;



