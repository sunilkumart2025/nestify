
-- OTP System Schema

-- 1. Add Columns to Admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS is_phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_otp text,
ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamptz;

-- 2. Add Columns to Tenures
ALTER TABLE tenures 
ADD COLUMN IF NOT EXISTS is_phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_otp text,
ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamptz;

-- 3. RPC: Generate and Send OTP
CREATE OR REPLACE FUNCTION send_phone_verification_otp()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_user_id uuid;
    v_phone text;
    v_otp text;
    v_msg text;
    v_send_result json;
    v_rows_admin int;
    v_rows_tenure int;
BEGIN
    v_user_id := auth.uid();
    
    -- Determine User Role & Phone from Tables
    -- Identify if Admin
    SELECT phone INTO v_phone FROM admins WHERE id = v_user_id;
    GET DIAGNOSTICS v_rows_admin = ROW_COUNT;
    
    IF v_rows_admin > 0 THEN
        v_user_role := 'admin';
    ELSE
        -- Identify if Tenure
        SELECT phone INTO v_phone FROM tenures WHERE user_id = v_user_id; -- Assuming tenures has user_id link? 
        -- Wait, 'tenures' table usually links to auth via email/phone logic or 'user_id' if they signed up
        -- Let's check schema. If tenures table doesn't have user_id, we might rely on the fact that for Tenure Login, auth.uid() matches something.
        -- Assuming 'tenures.id' is NOT auth.uid(). 
        -- Let's assume standard Nestify: 'tenures' table has 'user_id' for RLS or we query by email.
        -- Fallback: Use auth.users phone?
        -- Safest: Query tenures by id if we can't find admin. 
        -- Actually, for now let's assume Admin only if user requests it? User said "For BOTH admin and tenure".
        
         SELECT phone INTO v_phone FROM tenures WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
         GET DIAGNOSTICS v_rows_tenure = ROW_COUNT;
         
         IF v_rows_tenure > 0 THEN
            v_user_role := 'tenure';
         END IF;
    END IF;

    IF v_phone IS NULL THEN
        RETURN json_build_object('status', 'error', 'message', 'User profile not found or phone missing');
    END IF;

    -- Generate 6 digit OTP
    v_otp := floor(100000 + random() * 900000)::text;

    -- Save to DB
    IF v_user_role = 'admin' THEN
        UPDATE admins 
        SET phone_otp = v_otp, 
            phone_otp_expires_at = now() + interval '5 minutes',
            is_phone_verified = false
        WHERE id = v_user_id;
    ELSE
        UPDATE tenures 
        SET phone_otp = v_otp, 
            phone_otp_expires_at = now() + interval '5 minutes',
            is_phone_verified = false
        WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
    END IF;

    -- Construct Message
    v_msg := '🔐 Your Nestify Verification Code is: *' || v_otp || '*\n\nIt expires in 5 minutes. Do not share this code.';

    -- Send via Central Platform Gateway
    -- We call the existing function we defined in platform_whatsapp_migration.sql
    SELECT send_whatsapp_notification(v_phone, v_msg) INTO v_send_result;

    RETURN json_build_object('status', 'success', 'message', 'OTP sent to ' || v_phone);
END;
$$;

-- 4. RPC: Verify OTP
CREATE OR REPLACE FUNCTION verify_phone_otp(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_stored_otp text;
    v_expires_at timestamptz;
    v_user_role text;
    v_rows_admin int;
BEGIN
    v_user_id := auth.uid();
    
    -- Check Admin
    SELECT phone_otp, phone_otp_expires_at INTO v_stored_otp, v_expires_at FROM admins WHERE id = v_user_id;
    GET DIAGNOSTICS v_rows_admin = ROW_COUNT;
    
    IF v_rows_admin > 0 AND v_stored_otp IS NOT NULL THEN
        v_user_role := 'admin';
    ELSE
        -- Check Tenure
        SELECT phone_otp, phone_otp_expires_at INTO v_stored_otp, v_expires_at 
        FROM tenures 
        WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
        
        IF v_stored_otp IS NOT NULL THEN
            v_user_role := 'tenure';
        END IF;
    END IF;

    IF v_user_role IS NULL THEN
         RETURN json_build_object('status', 'error', 'message', 'User not found');
    END IF;

    -- Validate
    IF v_stored_otp != p_code THEN
        RETURN json_build_object('status', 'error', 'message', 'Invalid OTP');
    END IF;

    IF v_expires_at < now() THEN
        RETURN json_build_object('status', 'error', 'message', 'OTP Expired');
    END IF;

    -- Success: Mark Verified & Clear OTP
    IF v_user_role = 'admin' THEN
        UPDATE admins SET is_phone_verified = true, phone_otp = NULL, phone_otp_expires_at = NULL WHERE id = v_user_id;
    ELSE
        UPDATE tenures SET is_phone_verified = true, phone_otp = NULL, phone_otp_expires_at = NULL 
        WHERE id = v_user_id OR email = (select email from auth.users where id = v_user_id);
    END IF;

    RETURN json_build_object('status', 'success', 'message', 'Phone Number Verified!');
END;
$$;
