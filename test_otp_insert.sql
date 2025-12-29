DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the first admin user to test with
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.verification_codes (user_id, code, type, expires_at)
        VALUES (v_user_id, 'TEST00', 'TEST_CHECK', NOW() + INTERVAL '1 hour');
        RAISE NOTICE 'Test insert successful for user %', v_user_id;
    ELSE
        RAISE NOTICE 'No users found to test insert';
    END IF;
END $$;
