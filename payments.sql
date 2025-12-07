-- Drop old transactions table if it exists (replacing it with robust payments table)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- Create payments table with detailed fields as requested
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Gateway Details
    gateway_name VARCHAR(50) NOT NULL CHECK (gateway_name IN ('razorpay', 'cashfree')),
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    
    -- Customer Details
    customer_id VARCHAR(100), -- Maps to Tenure ID (string)
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    
    -- Payment Details
    order_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_mode VARCHAR(50), -- card, upi, netbanking, wallet
    payment_status VARCHAR(50) DEFAULT 'CREATED', -- CREATED, SUCCESS, FAILED
    payment_message VARCHAR(255),
    payment_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    bank_reference VARCHAR(100),
    
    -- System Links
    invoice_id UUID REFERENCES public.invoices(id),
    tenure_id UUID REFERENCES public.tenures(id),
    admin_id UUID REFERENCES public.admins(id),
    
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Tenants can view their own payments
CREATE POLICY "Tenures can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (auth.uid() = tenure_id);

-- 2. Admins can view payments addressed to them
CREATE POLICY "Admins can view their received payments"
ON public.payments FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

-- NOTE: We intentionally DO NOT allow direct INSERT/UPDATE from the client for security.
-- We will use a Secure RPC function to handle the payment recording and status update.
