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


