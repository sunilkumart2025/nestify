-- Create table to track automated billing runs
CREATE TABLE IF NOT EXISTS public.billing_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date DATE NOT NULL UNIQUE,
    run_type TEXT CHECK (run_type IN ('auto', 'manual')) DEFAULT 'auto',
    status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
    invoices_generated INT DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    execution_time_ms INT,
    triggered_by UUID REFERENCES public.admins(id), -- NULL for cron, admin_id for manual
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.billing_runs ENABLE ROW LEVEL SECURITY;

-- Admins can view all billing runs (platform-wide visibility for monitoring)
CREATE POLICY "Admins can view billing runs"
    ON public.billing_runs
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_billing_runs_date ON public.billing_runs(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_runs_status ON public.billing_runs(status);
