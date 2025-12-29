-- Update 2FA to use email OTP instead of authenticator apps
-- This simplifies the 2FA flow to email-based verification

-- 1. Ensure two_factor_enabled column exists
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tenures 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- 2. Remove TOTP-related columns (no longer needed for email OTP)
ALTER TABLE public.admins 
DROP COLUMN IF EXISTS totp_secret;

ALTER TABLE public.tenures 
DROP COLUMN IF EXISTS totp_secret;

-- 3. Drop backup codes table (not needed for email OTP)
DROP TABLE IF EXISTS public.backup_codes CASCADE;

-- 4. Drop TOTP-related functions
DROP FUNCTION IF EXISTS public.enable_totp(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.disable_totp();
DROP FUNCTION IF EXISTS public.save_backup_codes(TEXT[]);
DROP FUNCTION IF EXISTS public.verify_backup_code(TEXT);

-- 5. Ensure otp_codes table exists for email OTP
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on otp_codes
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own OTP codes
DROP POLICY IF EXISTS "Users can view their own OTP codes" ON public.otp_codes;
CREATE POLICY "Users can view their own OTP codes" 
ON public.otp_codes FOR SELECT 
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Service role can insert OTP codes
DROP POLICY IF EXISTS "Service can insert OTP codes" ON public.otp_codes;
CREATE POLICY "Service can insert OTP codes" 
ON public.otp_codes FOR INSERT 
WITH CHECK (true);

-- Policy: Service can delete expired OTP codes
DROP POLICY IF EXISTS "Service can delete OTP codes" ON public.otp_codes;
CREATE POLICY "Service can delete OTP codes" 
ON public.otp_codes FOR DELETE 
USING (true);

-- Notify
NOTIFY pgrst, 'reload schema';
