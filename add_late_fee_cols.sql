-- Add late fee configuration columns to admins table
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS late_fee_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_fee_daily_percent NUMERIC DEFAULT 0;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
