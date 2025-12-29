-- Completely reset the verification_codes table to ensure schema and permissions are correct
DROP TABLE IF EXISTS public.verification_codes;

CREATE TABLE public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'PAYMENT_CONFIG',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users and service role
GRANT ALL ON public.verification_codes TO postgres;
GRANT ALL ON public.verification_codes TO service_role;
GRANT SELECT, INSERT, DELETE ON public.verification_codes TO authenticated;

-- Policies
-- 1. Users can insert their own codes
CREATE POLICY "Users can insert own codes" ON public.verification_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Users can view their own codes
CREATE POLICY "Users can view own codes" ON public.verification_codes
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Users can delete their own codes
CREATE POLICY "Users can delete own codes" ON public.verification_codes
    FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_verification_codes_user_type ON public.verification_codes(user_id, type);

-- Test Insert (Optional, just to verify it works for the current user if run in SQL editor)
-- INSERT INTO public.verification_codes (user_id, code, expires_at) 
-- VALUES (auth.uid(), 'TEST00', NOW() + INTERVAL '10 minutes');
