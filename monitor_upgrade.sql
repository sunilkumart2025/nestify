-- Create a function to get global platform stats
-- This function accesses all data, so it must be SECURITY DEFINER
-- Ideally, access should be restricted, but for this "Monitor Login" flow we assume the app handles auth.

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_admins bigint;
    v_total_tenants bigint;
    v_total_revenue numeric;
    v_alert_count bigint;
    v_recent_activities json;
BEGIN
    -- 1. Count Total Admins
    SELECT count(*) INTO v_total_admins FROM admins;

    -- 2. Count Total Tenants
    SELECT count(*) INTO v_total_tenants FROM tenures;

    -- 3. Calculate Total Revenue (All time paid payments)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue 
    FROM payments 
    WHERE status = 'paid';

    -- 4. Count "Alerts" (Let's define alerts as recent errors in audit logs)
    SELECT count(*) INTO v_alert_count 
    FROM audit_logs 
    WHERE action LIKE '%ERROR%' OR action LIKE '%FAILED%' 
    AND created_at > (now() - interval '24 hours');

    -- 5. Fetch Recent Activities (Global)
    SELECT json_agg(t) INTO v_recent_activities
    FROM (
        SELECT 
            created_at,
            action as message,
            CASE 
                WHEN action LIKE '%ERROR%' THEN 'error'
                WHEN action LIKE '%LOGIN%' THEN 'auth'
                ELSE 'info'
            END as type
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    -- 6. Fetch High Risk Tenants
    DECLARE
        v_high_risk_tenants json;
    BEGIN
        SELECT json_agg(t) INTO v_high_risk_tenants
        FROM (
            SELECT full_name, trust_score, status 
            FROM tenures 
            WHERE trust_score < 40 
            ORDER BY trust_score ASC 
            LIMIT 5
        ) t;
    END;

    -- Return JSON object
    RETURN json_build_object(
        'total_admins', v_total_admins,
        'total_tenants', v_total_tenants,
        'total_revenue', v_total_revenue,
        'alert_count', v_alert_count,
        'recent_activities', COALESCE(v_recent_activities, '[]'::json),
        'high_risk_tenants', COALESCE(v_high_risk_tenants, '[]'::json)
    );
END;
$$;
