
-- Master Automation Function
-- Called by Admin Dashboard (Lazy Cron)
-- Orchestrates all daily tasks

DROP FUNCTION IF EXISTS run_daily_automations();

CREATE OR REPLACE FUNCTION run_daily_automations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id uuid;
    v_result jsonb;
BEGIN
    -- Get Current User (Admin)
    v_admin_id := auth.uid();
    
    IF v_admin_id IS NULL THEN
        RETURN json_build_object('error', 'Unauthorized');
    END IF;

    -- 1. Run Auto-Pilot Late Fees
    -- This checks overdue invoices and applies configured fees
    -- We ignore the result payload for now, just logging internal usage if needed
    PERFORM process_automated_late_fees(v_admin_id);

    -- 2. Future: Auto-Archive old logs
    -- 3. Future: Send Digest Emails

    RETURN json_build_object('status', 'success', 'timestamp', now());
END;
$$;
