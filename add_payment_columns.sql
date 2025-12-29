-- Add payment configuration columns to admins table if they don't exist
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'PLATFORM',
ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT,
ADD COLUMN IF NOT EXISTS razorpay_webhook_secret TEXT;

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'payment_mode') THEN
        RAISE EXCEPTION 'Column payment_mode missing';
    END IF;
END $$;
