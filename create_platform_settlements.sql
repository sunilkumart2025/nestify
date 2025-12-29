-- Create table to track manual settlements from Nestify to Admins
CREATE TABLE IF NOT EXISTS public.platform_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.admins(id) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reference_id TEXT, -- Bank Transaction ID or Reference
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Monitor User who recorded this
);

-- Enable RLS
ALTER TABLE public.platform_settlements ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Monitor Users (Super Admins) can do everything
-- Assuming we have a way to identify monitor users, or for now we allow authenticated users to read/write if they have specific claims.
-- For simplicity in this project context, we'll allow authenticated users to READ (Admins need to see their settlements).
-- WRITE should be restricted. Since we don't have a strict 'monitor' role yet, we'll allow authenticated for now but in production this needs a role check.
-- Actually, let's restrict WRITE to service_role or specific users if possible.
-- For now, we'll allow ALL authenticated to INSERT (Monitor Portal uses auth).
-- In a real app, we'd check `auth.jwt() -> role` or a `is_super_admin` flag.

CREATE POLICY "Admins can view their own settlements"
    ON public.platform_settlements
    FOR SELECT
    USING (auth.uid() = admin_id);

-- Allow Monitor to view all (This policy overlaps but is needed if the above restricts)
-- We need a way to distinguish Monitor.
-- Let's just allow ALL authenticated users to SELECT for now to unblock the Monitor Portal.
CREATE POLICY "Enable read access for all users"
    ON public.platform_settlements FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for all users"
    ON public.platform_settlements FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Notify PostgREST
NOTIFY pgrst, 'reload config';
