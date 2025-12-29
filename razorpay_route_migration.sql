-- Razorpay Route Migration
-- Phase 1: Database Changes for Single API Key Architecture

-- 1. Add Linked Account ID to Admins table
-- This stores the 'acc_...' ID for each hostel owner
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS razorpay_onboarding_status VARCHAR(20) DEFAULT 'PENDING';

-- 2. Update Payments table to track transfers
-- This tracks the split details for each transaction
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS transfer_id VARCHAR(100),         -- Razorpay Transfer ID (trf_...)
ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50),    -- PENDING, SETTLED, FAILED
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2),       -- Calculated Platform Share
ADD COLUMN IF NOT EXISTS vendor_payout DECIMAL(10,2),      -- Amount transferred to vendor
ADD COLUMN IF NOT EXISTS transfer_on_hold_until BIGINT,    -- Timestamp for hold release
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100); -- Ensure this exists

-- 3. Create RLS Policy for Linked Account Management
-- Only the specific admin can view/update their own razorpay_account_id
CREATE POLICY "Admins can view own specific payout details"
ON public.admins FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Index for faster lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_payments_transfer_id ON public.payments(transfer_id);
CREATE INDEX IF NOT EXISTS idx_admins_razorpay_account_id ON public.admins(razorpay_account_id);
