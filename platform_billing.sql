-- Table to track how much each Admin owes to the Platform (Antigravity/Nestify)
CREATE TABLE IF NOT EXISTS platform_dues (
    admin_id uuid PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    amount_due numeric DEFAULT 0 CHECK (amount_due >= 0),
    last_payment_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_dues ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view their own dues
CREATE POLICY "Admins can view own dues" ON platform_dues
    FOR SELECT USING (auth.uid() = admin_id);

-- Function to calculate and append platform fee on Invoice Creation
CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_fee numeric;
    v_fixed_fee numeric := 10; -- ₹10 Fixed Fee
    v_percent numeric := 0.0015; -- 0.15% Commission
BEGIN
    -- Calculate Fee: Fixed + % of Invoice Amount
    v_fee := v_fixed_fee + (COALESCE(NEW.total_amount, 0) * v_percent);
    
    -- Update or Insert Dues
    INSERT INTO platform_dues (admin_id, amount_due, updated_at)
    VALUES (NEW.admin_id, v_fee, now())
    ON CONFLICT (admin_id) 
    DO UPDATE SET 
        amount_due = platform_dues.amount_due + v_fee,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run on Invoice Creation
DROP TRIGGER IF EXISTS trigger_platform_fee_insert ON invoices;
CREATE TRIGGER trigger_platform_fee_insert
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_platform_fee();

-- Handle Updates? (User asked for "modify" too)
-- If amount increases, charge delta fee.
CREATE OR REPLACE FUNCTION calculate_platform_fee_update()
RETURNS TRIGGER AS $$
DECLARE
    v_fee numeric;
    v_fixed_fee numeric := 0; -- No fixed fee on update, just percentage on delta? Or simple logic.
    v_percent numeric := 0.0015;
    v_delta numeric;
BEGIN
    -- If amount increased
    IF NEW.total_amount > OLD.total_amount THEN
        v_delta := NEW.total_amount - OLD.total_amount;
        v_fee := v_delta * v_percent; -- Only charge % on the added amount
        
        UPDATE platform_dues 
        SET amount_due = amount_due + v_fee, updated_at = now()
        WHERE admin_id = NEW.admin_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_platform_fee_update ON invoices;
CREATE TRIGGER trigger_platform_fee_update
AFTER UPDATE OF total_amount ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_platform_fee_update();


-- RPC to Fetch Dues
CREATE OR REPLACE FUNCTION get_my_platform_dues()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_amount numeric;
BEGIN
    SELECT amount_due INTO v_amount FROM platform_dues WHERE admin_id = auth.uid();
    RETURN COALESCE(v_amount, 0);
END;
$$;

-- RPC to Clear Dues (Called after successful payment)
CREATE OR REPLACE FUNCTION clear_platform_dues(p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE platform_dues 
    SET amount_due = GREATEST(0, amount_due - p_amount),
        last_payment_at = now()
    WHERE admin_id = auth.uid();
END;
$$;
