-- Dual Payment Gateway Migration
-- Enables pgcrypto and adds columns for storing custom Razorpay credentials

-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add payment_mode column to admins
-- We use a text check constraint instead of ENUM for easier updates
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'PLATFORM' CHECK (payment_mode IN ('PLATFORM', 'OWN'));

-- 3. Add columns for custom Razorpay credentials
-- razorpay_key_id: Can be stored as plain text (it's public)
-- razorpay_key_secret: MUST be encrypted
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS razorpay_key_id text,
ADD COLUMN IF NOT EXISTS razorpay_key_secret text;

-- 4. Create a helper function to securely set the secret
-- This avoids sending the raw secret in a simple UPDATE statement logs if not careful,
-- though standard HTTPS + RLS is usually enough. 
-- However, we need to encrypt it *before* it hits the disk.
-- We'll handle encryption in the Edge Function or Frontend? 
-- BETTER: Handle encryption in the Database via a Function, so Frontend sends raw, DB encrypts.

CREATE OR REPLACE FUNCTION public.update_admin_payment_config(
    p_payment_mode text,
    p_key_id text,
    p_key_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate mode
    IF p_payment_mode NOT IN ('PLATFORM', 'OWN') THEN
        RAISE EXCEPTION 'Invalid payment mode';
    END IF;

    -- Update admin record
    -- If p_key_secret is provided (not null/empty), encrypt it.
    -- If it's null (user didn't change it), keep existing.
    UPDATE public.admins
    SET 
        payment_mode = p_payment_mode,
        razorpay_key_id = COALESCE(p_key_id, razorpay_key_id),
        razorpay_key_secret = CASE 
            WHEN p_key_secret IS NOT NULL AND p_key_secret != '' 
            THEN pgp_sym_encrypt(p_key_secret, current_setting('app.settings.encryption_key', true)) -- We need a master key!
            -- Wait, Supabase doesn't easily expose a master key in SQL without setup.
            -- Alternative: Use a fixed key defined in Vault or just rely on RLS?
            -- RLS doesn't protect against DB dumps. Encryption does.
            -- Let's use a hardcoded key for now OR better, let the Edge Function handle encryption/decryption?
            -- Actually, Edge Function is safer for encryption/decryption logic.
            -- Let's just store the columns for now. We will handle encryption in the Edge Function (onboard-vendor or similar).
            -- REVISION: We will store them as TEXT for now, and the Edge Function will handle encryption before INSERT/UPDATE.
            -- actually, let's just use pgcrypto with a key from env if possible? No.
            -- Let's stick to: Frontend sends to Edge Function -> Edge Function Encrypts -> DB.
            -- So for this migration, just columns are enough.
            ELSE razorpay_key_secret
        END
    WHERE id = auth.uid();
END;
$$;

-- Actually, let's drop the function approach for now and stick to Edge Function logic for security.
-- Just creating columns.
DROP FUNCTION IF EXISTS public.update_admin_payment_config;

-- 5. RLS Policies
-- Ensure admins can read their own config (but maybe NOT the secret? Or yes, to verify it's set?)
-- Usually we don't send the secret back to frontend.
-- We'll handle that in the API.

COMMENT ON COLUMN public.admins.payment_mode IS 'PLATFORM or OWN';
COMMENT ON COLUMN public.admins.razorpay_key_secret IS 'Encrypted Razorpay Secret Key';
