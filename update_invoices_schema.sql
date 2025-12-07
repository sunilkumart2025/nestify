-- Add due_date column to invoices if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
        ALTER TABLE public.invoices ADD COLUMN due_date DATE;
        
        -- Backfill existing rows with (created_at + 7 days) as default
        UPDATE public.invoices SET due_date = (created_at + INTERVAL '5 days')::DATE WHERE due_date IS NULL;
    END IF;
END $$;
