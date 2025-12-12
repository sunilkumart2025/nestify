-- Add trust_score column to tenures
ALTER TABLE public.tenures ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 60;

-- Create function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(p_tenure_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score integer := 60; -- Base Score
    v_paid_invoices integer;
    v_overdue_invoices integer;
    v_failed_transactions integer;
    v_is_verified boolean;
BEGIN
    -- 1. Check Phone Verification (Bonus: +10)
    -- Note: is_phone_verified column was added in otp_system_migration.sql
    -- We'll check if it exists or default to false
    BEGIN
        SELECT is_phone_verified INTO v_is_verified FROM tenures WHERE id = p_tenure_id;
    EXCEPTION WHEN OTHERS THEN
        v_is_verified := false;
    END;

    IF v_is_verified THEN
        v_score := v_score + 10;
    END IF;

    -- 2. Good Behavior: Paid Invoices (+2 each, max +20)
    SELECT count(*) INTO v_paid_invoices 
    FROM invoices 
    WHERE tenure_id = p_tenure_id AND status = 'paid';
    
    v_score := v_score + (LEAST(v_paid_invoices, 10) * 2);

    -- 3. Bad Behavior: Overdue/Pending Invoices (-5 each)
    -- Assuming invoices created more than 7 days ago and still pending
    SELECT count(*) INTO v_overdue_invoices
    FROM invoices 
    WHERE tenure_id = p_tenure_id 
    AND status = 'pending' 
    AND created_at < (now() - interval '7 days');

    v_score := v_score - (v_overdue_invoices * 5);

    -- 4. Bad Behavior: Failed Payments (-2 each)
    -- Look at transactions linked to this tenure's invoices
    SELECT count(*) INTO v_failed_transactions
    FROM transactions t
    JOIN invoices i ON t.invoice_id = i.id
    WHERE i.tenure_id = p_tenure_id AND t.status = 'failed';

    v_score := v_score - (v_failed_transactions * 2);

    -- Clamp Score between 0 and 100
    IF v_score > 100 THEN v_score := 100; END IF;
    IF v_score < 0 THEN v_score := 0; END IF;

    -- Update the table
    UPDATE tenures SET trust_score = v_score WHERE id = p_tenure_id;

    RETURN v_score;
END;
$$;
