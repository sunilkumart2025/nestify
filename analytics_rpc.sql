
-- Drop existing if conflict
DROP FUNCTION IF EXISTS get_admin_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_beds integer;
    v_occupied_beds integer;
    v_total_revenue numeric;
    v_pending_dues numeric;
    v_open_complaints integer;
    v_occupancy_rate numeric;
BEGIN
    -- 1. Calculate Occupancy
    -- Assumes rooms have 'capacity' and tenures count against it
    SELECT COALESCE(SUM(capacity), 0) INTO v_total_beds
    FROM rooms
    WHERE admin_id = p_admin_id;

    SELECT COUNT(*) INTO v_occupied_beds
    FROM tenures
    WHERE admin_id = p_admin_id AND status = 'active';

    IF v_total_beds > 0 THEN
        v_occupancy_rate := ROUND((v_occupied_beds::numeric / v_total_beds::numeric) * 100, 1);
    ELSE
        v_occupancy_rate := 0;
    END IF;

    -- 2. Calculate Revenue (Current Month)
    -- Sum of PAID invoices where payment_date is in current month
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
    FROM invoices
    WHERE admin_id = p_admin_id 
    AND status = 'paid'
    AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);

    -- 3. Calculate Pending Dues (All time)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_pending_dues
    FROM invoices
    WHERE admin_id = p_admin_id 
    AND status IN ('pending', 'overdue');

    -- 4. Open Complaints
    SELECT COUNT(*) INTO v_open_complaints
    FROM complaints
    WHERE admin_id = p_admin_id 
    AND status = 'open';

    RETURN json_build_object(
        'total_beds', v_total_beds,
        'occupied_beds', v_occupied_beds,
        'occupancy_rate', v_occupancy_rate,
        'revenue_month', v_total_revenue,
        'pending_dues', v_pending_dues,
        'open_issues', v_open_complaints
    );
END;
$$;
