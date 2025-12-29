-- Add updated_at column if it doesn't exist
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reload PostgREST schema cache to recognize the new column
NOTIFY pgrst, 'reload schema';
