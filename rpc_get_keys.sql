-- Function to safely get public payment keys for a specific admin
-- This allows tenants to fetch the Key ID/App ID needed for the frontend SDKs
-- without exposing the Secret Keys which are also stored in the admins table.

CREATE OR REPLACE FUNCTION get_payment_config(target_admin_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres) to bypass RLS on admins table if needed, though we filter strictly
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'razorpay_key_id', razorpay_key_id,
        'cashfree_app_id', cashfree_app_id,
        'cashfree_env', 'TEST' -- Defaulting to TEST for now, could be column in DB
    )
    INTO result
    FROM public.admins
    WHERE id = target_admin_id;

    RETURN result;
END;
$$;
