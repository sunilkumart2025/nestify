-- Function to fetch paginated global admins
CREATE OR REPLACE FUNCTION get_global_admins(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset integer;
    v_admins json;
    v_total bigint;
BEGIN
    v_offset := (page_number - 1) * page_size;

    SELECT count(*) INTO v_total FROM admins;

    SELECT json_agg(t) INTO v_admins
    FROM (
        SELECT 
            id, 
            full_name, 
            email, 
            phone, 
            hostel_name, 
            created_at
        FROM admins
        ORDER BY created_at DESC
        LIMIT page_size OFFSET v_offset
    ) t;

    RETURN json_build_object(
        'data', COALESCE(v_admins, '[]'::json),
        'total', v_total
    );
END;
$$;

-- Function to fetch paginated global tenants with trust scores
CREATE OR REPLACE FUNCTION get_global_tenants(
    page_number integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset integer;
    v_tenants json;
    v_total bigint;
BEGIN
    v_offset := (page_number - 1) * page_size;

    SELECT count(*) INTO v_total FROM tenures;

    SELECT json_agg(t) INTO v_tenants
    FROM (
        SELECT 
            t.id,
            t.full_name,
            t.status,
            t.trust_score,
            a.hostel_name,
            t.created_at
        FROM tenures t
        JOIN admins a ON t.admin_id = a.id
        ORDER BY t.created_at DESC
        LIMIT page_size OFFSET v_offset
    ) t;

    RETURN json_build_object(
        'data', COALESCE(v_tenants, '[]'::json),
        'total', v_total
    );
END;
$$;

-- Function to fetch global transaction stream
CREATE OR REPLACE FUNCTION get_global_transactions(
    limit_count integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transactions json;
BEGIN
    SELECT json_agg(t) INTO v_transactions
    FROM (
        SELECT 
            tr.id,
            tr.amount,
            tr.status,
            tr.created_at,
            tr.payment_method,
            t.full_name as tenant_name,
            a.hostel_name
        FROM transactions tr
        JOIN invoices i ON tr.invoice_id = i.id
        JOIN tenures t ON i.tenure_id = t.id
        JOIN admins a ON t.admin_id = a.id
        ORDER BY tr.created_at DESC
        LIMIT limit_count
    ) t;

    RETURN COALESCE(v_transactions, '[]'::json);
END;
$$;
