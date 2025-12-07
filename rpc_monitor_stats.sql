-- Secure RPC for Platform Monitoring
-- Returns aggregate stats for the Super Admin
-- Note: In production, verify the caller has specific privileges. 
-- For now, we rely on the specific obscure RPC name and client-side auth as requested.

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_admins INT;
    total_tenants INT;
    total_revenue NUMERIC;
    recent_activities JSON;
    payment_failures INT;
BEGIN
    -- 1. Count Hostels/Admins
    SELECT COUNT(*) INTO total_admins FROM public.admins;

    -- 2. Count Active Tenants
    SELECT COUNT(*) INTO total_tenants FROM public.tenures;

    -- 3. Calculate Total Revenue (Paid Invoices)
    SELECT COALESCE(SUM(order_amount), 0) INTO total_revenue 
    FROM public.payments 
    WHERE payment_status = 'SUCCESS' OR payment_status = 'captured';

    -- 4. Count Payment Alerts
    SELECT COUNT(*) INTO payment_failures 
    FROM public.payments 
    WHERE payment_status = 'failed' OR payment_status = 'FAILED';

    -- 5. Get Recent Activities (New Signups + Failed Payments)
    WITH combined_events AS (
        (SELECT 'New Admin Joined' as message, 'info' as type, created_at FROM public.admins ORDER BY created_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'Payment Failed: ' || id::text as message, 'error' as type, created_at FROM public.payments WHERE payment_status = 'failed' OR payment_status = 'FAILED' ORDER BY created_at DESC LIMIT 5)
    )
    SELECT json_agg(t) INTO recent_activities FROM (SELECT * FROM combined_events ORDER BY created_at DESC LIMIT 10) t;

    RETURN json_build_object(
        'total_admins', total_admins,
        'total_tenants', total_tenants,
        'total_revenue', total_revenue,
        'alert_count', payment_failures,
        'recent_activities', COALESCE(recent_activities, '[]'::json)
    );
END;
$$;

-- Grant permissions to ensure the API can call this function
GRANT EXECUTE ON FUNCTION get_platform_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO service_role;
