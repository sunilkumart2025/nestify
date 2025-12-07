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
