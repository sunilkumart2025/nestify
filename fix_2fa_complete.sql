-- Complete 2FA Implementation Fix
-- This script ensures 2FA columns exist and creates the necessary RPC functions

-- 1. Ensure columns exist (using consistent naming)
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tenures 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- 2. Add TOTP secret storage column
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS totp_secret TEXT;

ALTER TABLE public.tenures 
ADD COLUMN IF NOT EXISTS totp_secret TEXT;

-- 3. Create backup codes table if not exists
CREATE TABLE IF NOT EXISTS public.backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

-- Policies for backup codes
DROP POLICY IF EXISTS "Users can view their own backup codes" ON public.backup_codes;
CREATE POLICY "Users can view their own backup codes" 
ON public.backup_codes FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own backup codes" ON public.backup_codes;
CREATE POLICY "Users can insert their own backup codes" 
ON public.backup_codes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own backup codes" ON public.backup_codes;
CREATE POLICY "Users can update their own backup codes" 
ON public.backup_codes FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Create enable_totp RPC function
CREATE OR REPLACE FUNCTION public.enable_totp(
    p_secret TEXT,
    p_encryption_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_encrypted_secret TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get user role
    SELECT raw_user_meta_data->>'role' INTO v_role 
    FROM auth.users 
    WHERE id = v_user_id;

    -- Encrypt the secret (using pgcrypto)
    v_encrypted_secret := encode(
        encrypt(p_secret::bytea, p_encryption_key::bytea, 'aes'),
        'base64'
    );

    -- Update the appropriate table based on role
    IF v_role = 'admin' THEN
        UPDATE public.admins 
        SET 
            two_factor_enabled = TRUE,
            totp_secret = v_encrypted_secret
        WHERE id = v_user_id;
    ELSIF v_role = 'tenure' THEN
        UPDATE public.tenures 
        SET 
            two_factor_enabled = TRUE,
            totp_secret = v_encrypted_secret
        WHERE id = v_user_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid user role');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Create disable_totp RPC function
CREATE OR REPLACE FUNCTION public.disable_totp()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT raw_user_meta_data->>'role' INTO v_role 
    FROM auth.users 
    WHERE id = v_user_id;

    IF v_role = 'admin' THEN
        UPDATE public.admins 
        SET 
            two_factor_enabled = FALSE,
            totp_secret = NULL
        WHERE id = v_user_id;
    ELSIF v_role = 'tenure' THEN
        UPDATE public.tenures 
        SET 
            two_factor_enabled = FALSE,
            totp_secret = NULL
        WHERE id = v_user_id;
    END IF;

    -- Delete backup codes
    DELETE FROM public.backup_codes WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Create save_backup_codes RPC function
CREATE OR REPLACE FUNCTION public.save_backup_codes(
    p_plain_codes TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_code TEXT;
    v_hash TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Delete existing backup codes
    DELETE FROM public.backup_codes WHERE user_id = v_user_id;

    -- Insert new hashed codes
    FOREACH v_code IN ARRAY p_plain_codes
    LOOP
        v_hash := encode(digest(v_code, 'sha256'), 'hex');
        INSERT INTO public.backup_codes (user_id, code_hash)
        VALUES (v_user_id, v_hash);
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Create verify_backup_code RPC function
CREATE OR REPLACE FUNCTION public.verify_backup_code(
    p_code_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_hash TEXT;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Hash the input code
    v_hash := encode(digest(p_code_input, 'sha256'), 'hex');

    -- Check if code exists and is not used
    SELECT EXISTS(
        SELECT 1 FROM public.backup_codes 
        WHERE user_id = v_user_id 
        AND code_hash = v_hash 
        AND used = FALSE
    ) INTO v_exists;

    IF v_exists THEN
        -- Mark as used
        UPDATE public.backup_codes 
        SET used = TRUE 
        WHERE user_id = v_user_id AND code_hash = v_hash;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.enable_totp(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_totp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_backup_codes(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_backup_code(TEXT) TO authenticated;

-- Notify
NOTIFY pgrst, 'reload schema';
