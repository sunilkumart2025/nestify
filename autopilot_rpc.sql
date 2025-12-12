
-- Auto-Pilot Late Fee Engine
-- 1. Finds invoices past due date
-- 2. Adds 'Late Fee' item if not exists
-- 3. Updates total amount

CREATE OR REPLACE FUNCTION process_auto_pilot(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_late_fee_amount numeric := 50; -- Daily or One-time (Simple implementation: One-time 50 for now)
    v_updated_count integer := 0;
    v_new_total numeric;
    v_has_late_fee boolean;
BEGIN
    -- Loop through overdue pending invoices
    FOR v_invoice IN 
        SELECT * FROM invoices 
        WHERE admin_id = p_admin_id 
        AND status = 'pending'
        AND due_date < CURRENT_DATE
    LOOP
        -- Check if Late Fee already applied
        SELECT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(v_invoice.items) AS item 
            WHERE item->>'type' = 'late_fee'
        ) INTO v_has_late_fee;

        IF NOT v_has_late_fee THEN
            -- Add Late Fee Item
            v_new_total := v_invoice.total_amount + v_late_fee_amount;
            
            UPDATE invoices
            SET 
                items = items || jsonb_build_object(
                    'description', 'Late Payment Fee',
                    'amount', v_late_fee_amount,
                    'type', 'late_fee'
                ),
                total_amount = v_new_total
            WHERE id = v_invoice.id;

            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'processed_count', v_updated_count
    );
END;
$$;
