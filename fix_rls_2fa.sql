-- Fix RLS policies to allow users to update their own 2FA status

-- 1. Admins Table Policy
DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admins;
CREATE POLICY "Admins can update their own profile" 
ON public.admins FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Tenures Table Policy
DROP POLICY IF EXISTS "Tenures can update their own profile" ON public.tenures;
CREATE POLICY "Tenures can update their own profile" 
ON public.tenures FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Ensure two_factor_enabled column exists (just in case)
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tenures 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- 4. Sync old column if exists (migration cleanup)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'is_2fa_enabled') THEN
        UPDATE public.admins SET two_factor_enabled = is_2fa_enabled WHERE two_factor_enabled IS FALSE AND is_2fa_enabled IS TRUE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenures' AND column_name = 'is_2fa_enabled') THEN
        UPDATE public.tenures SET two_factor_enabled = is_2fa_enabled WHERE two_factor_enabled IS FALSE AND is_2fa_enabled IS TRUE;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
