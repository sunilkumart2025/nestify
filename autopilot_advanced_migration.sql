
-- 1. Add Late Fee Configuration to Admin Profile
ALTER TABLE admins ADD COLUMN IF NOT EXISTS late_fee_daily_percent numeric DEFAULT 0;

-- 2. Advanced Late Fee Engine
-- Logic: 
-- Daily Fee = Subtotal * (Rate/100)
-- Total Late Fee = Daily Fee * Days Overdue
-- Updates existing 'late_fee' item if present, or adds new one.
-- Recalculates Total Amount = Subtotal + Fees + New Late Fee

CREATE OR REPLACE FUNCTION process_automated_late_fees(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_admin_config RECORD;
    v_daily_fee numeric;
    v_days_late integer;
    v_total_late_fee numeric;
    v_new_items jsonb;
    v_new_total numeric;
    v_updated_count integer := 0;
    v_item jsonb;
    v_platform_fees numeric;
BEGIN
    -- Get Admin Config
    SELECT late_fee_daily_percent INTO v_admin_config 
    FROM admins WHERE id = p_admin_id;

    -- If no late fee configured or 0, do nothing
    IF v_admin_config.late_fee_daily_percent IS NULL OR v_admin_config.late_fee_daily_percent <= 0 THEN
        RETURN json_build_object('status', 'skipped', 'message', 'No late fee configured');
    END IF;

    -- Loop through overdue pending invoices
    FOR v_invoice IN 
        SELECT * FROM invoices 
        WHERE admin_id = p_admin_id 
        AND status = 'pending'
        AND due_date < CURRENT_DATE
    LOOP
        -- Calculate Days Late
        v_days_late := CURRENT_DATE - v_invoice.due_date;
        
        -- Calculate Daily Fee based on Subtotal
        v_daily_fee := v_invoice.subtotal * (v_admin_config.late_fee_daily_percent / 100);
        
        -- Total Late Fee Accumulated
        v_total_late_fee := ROUND(v_daily_fee * v_days_late, 2);

        -- Construct New Items Array (Remove old late fee, add new one)
        v_new_items := '[]'::jsonb;
        v_platform_fees := 0;

        FOR v_item IN SELECT * FROM jsonb_array_elements(v_invoice.items)
        LOOP
            -- Keep strict track of other fees to rebuild total
            IF v_item->>'type' = 'late_fee' THEN
                -- Skip old late fee (we replace it)
                CONTINUE;
            ELSE
                v_new_items := v_new_items || v_item;
                -- Add to fee sum if it's a fee (excluding subtotal items usually)
                -- Actually, we can just rebuild total from Subtotal + Non-Rent Items
                -- Safest: Just keep the item
                IF v_item->>'type' = 'fee' THEN
                   v_platform_fees := v_platform_fees + (v_item->>'amount')::numeric;
                END IF;
            END IF;
        END LOOP;

        -- Add Updated Late Fee Item
        v_new_items := v_new_items || jsonb_build_object(
            'description', 'Late Fee (' || v_days_late || ' days @ ' || v_admin_config.late_fee_daily_percent || '%)',
            'amount', v_total_late_fee,
            'type', 'late_fee'
        );

        -- Recalculate Invoice Total
        -- Total = Subtotal + Platform Fees + Late Fee
        -- Note: v_platform_fees calculated above might miss some static fees if logic changes
        -- Better reliability: Base it on previous total minus old late fee
        
        v_new_total := v_invoice.subtotal + v_platform_fees + v_total_late_fee;

        -- Update Invoice
        UPDATE invoices
        SET 
            items = v_new_items,
            total_amount = v_new_total
        WHERE id = v_invoice.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'processed_count', v_updated_count,
        'rate_applied', v_admin_config.late_fee_daily_percent
    );
END;
$$;
