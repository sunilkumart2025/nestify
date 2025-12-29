CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee numeric;
    v_fixed_fee numeric := 20; -- ₹20 Fixed Fee (Updated as per user request)
    v_percent numeric := 0.006; -- 0.6% Platform Share
    v_mode text;
BEGIN
    -- 1. Check Admin's Payment Mode
    SELECT payment_mode INTO v_mode FROM admins WHERE id = NEW.admin_id;

    -- 2. Only apply if mode is 'OWN' (Own Gateway)
    -- If mode is 'PLATFORM', fees are split automatically at source via Razorpay Route
    IF v_mode = 'OWN' THEN
        -- Calculate Fee: Fixed + % of Invoice Amount
        -- Note: The frontend adds these fees to the bill, so the Admin collects them from Tenant.
        -- This trigger ensures the Admin then OWES this amount to the Platform.
        v_fee := v_fixed_fee + (COALESCE(NEW.total_amount, 0) * v_percent);
        
        -- Update or Insert Dues
        INSERT INTO platform_dues (admin_id, amount_due, updated_at)
        VALUES (NEW.admin_id, v_fee, now())
        ON CONFLICT (admin_id) 
        DO UPDATE SET 
            amount_due = platform_dues.amount_due + v_fee,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
