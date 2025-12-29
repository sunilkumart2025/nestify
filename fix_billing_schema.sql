-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create billing_runs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.billing_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date DATE NOT NULL, -- Removed UNIQUE constraint here
    run_type TEXT CHECK (run_type IN ('auto', 'manual')) DEFAULT 'auto',
    status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
    invoices_generated INT DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    execution_time_ms INT,
    triggered_by UUID REFERENCES public.admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Remove UNIQUE constraint on run_date if it exists (to allow multiple manual runs per day)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_runs_run_date_key') THEN
        ALTER TABLE public.billing_runs DROP CONSTRAINT billing_runs_run_date_key;
    END IF;
END $$;

-- 3. Enable RLS on billing_runs
ALTER TABLE public.billing_runs ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policy for billing_runs if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_runs' AND policyname = 'Admins can view billing runs') THEN
        CREATE POLICY "Admins can view billing runs" ON public.billing_runs FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Add columns to admins table
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS billing_cycle_day INT DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS fixed_maintenance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_electricity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_water NUMERIC DEFAULT 0;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_runs_date ON public.billing_runs(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_runs_status ON public.billing_runs(status);

-- 7. Reload Schema Cache
NOTIFY pgrst, 'reload config';
