-- Create table for storing OTPs
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'PAYMENT_CONFIG', -- 'PAYMENT_CONFIG', 'LOGIN', etc.
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own codes (though usually backend handles this)
CREATE POLICY "Users can view own codes" ON public.verification_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_type ON public.verification_codes(user_id, type);
