-- Create table for tracking platform fees from admins using their own gateway
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.admins(id) NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id),
    gateway_payment_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL, -- The fee amount due
    currency TEXT DEFAULT 'INR',
    status TEXT CHECK (status IN ('DUE', 'PAID', 'WAIVED')) DEFAULT 'DUE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own fees"
    ON public.platform_fee_ledger
    FOR SELECT
    USING (auth.uid() = admin_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_admin ON public.platform_fee_ledger(admin_id);
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_status ON public.platform_fee_ledger(status);
