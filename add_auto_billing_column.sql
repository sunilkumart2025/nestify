-- Add auto_billing_enabled column to admins table
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
