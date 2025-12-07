-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to reset password using a verified OTP
CREATE OR REPLACE FUNCTION reset_password_via_otp(
    target_email TEXT,
    otp_code TEXT,
    new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    valid_otp BOOLEAN;
    user_id UUID;
BEGIN
    -- 1. Verify OTP
    SELECT EXISTS (
        SELECT 1 FROM public.otp_codes
        WHERE email = target_email
        AND code = otp_code
        AND expires_at > NOW()
    ) INTO valid_otp;

    IF NOT valid_otp THEN
        RETURN json_build_object('success', false, 'message', 'Invalid or expired OTP');
    END IF;

    -- 2. Check if user exists in auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;
    
    IF user_id IS NULL THEN
         RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- 3. Update Password
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = user_id;

    -- 4. Delete used OTP
    DELETE FROM public.otp_codes WHERE email = target_email AND code = otp_code;

    RETURN json_build_object('success', true, 'message', 'Password reset successfully');
END;
$$;

-- Function to check if a user exists (for forgot password flow)
CREATE OR REPLACE FUNCTION check_user_exists(target_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = target_email);
END;
$$;
