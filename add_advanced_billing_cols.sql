-- Add advanced billing configuration columns to admins table
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS billing_cycle_day INT DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS fixed_maintenance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_electricity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_water NUMERIC DEFAULT 0;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
