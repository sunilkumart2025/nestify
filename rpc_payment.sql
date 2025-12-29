-- Secure Function to record a successful payment and update the invoice
-- Enhanced with Signature Verification for Razorpay

CREATE OR REPLACE FUNCTION record_payment_success(
    p_invoice_id UUID,
    p_tenure_id UUID,
    p_admin_id UUID,
    p_gateway_name TEXT,
    p_gateway_payment_id TEXT,
    p_gateway_order_id TEXT,
    p_gateway_signature TEXT,
    p_amount DECIMAL,
    p_payment_mode TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_payment_id UUID;
    v_inv_amount DECIMAL;
    v_secret_key TEXT;
    v_generated_signature TEXT;
BEGIN
    -- 1. SECURITY CHECK: Verify Amount
    SELECT total_amount INTO v_inv_amount FROM invoices WHERE id = p_invoice_id;
    
    IF v_inv_amount IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invoice not found');
    END IF;

    -- Allow 1 rupee tolerance for float differences, but strictly checks usually beneficial
    IF p_amount < (v_inv_amount - 1) THEN
         RETURN json_build_object('success', false, 'error', 'Payment amount mismatch. Paid: ' || p_amount || ', Expected: ' || v_inv_amount);
    END IF;

    -- 2. SECURITY CHECK: Verify Gateway Signature (For Razorpay)
    IF p_gateway_name = 'razorpay' THEN
        -- Allow bypass if verified by Edge Function (Service Role)
        IF p_gateway_signature = 'VERIFIED_BY_EDGE_FUNCTION' THEN
            -- Skip check, trust the caller (Edge Function)
            NULL;
        ELSE
            SELECT razorpay_key_secret INTO v_secret_key FROM admins WHERE id = p_admin_id;
            
            IF v_secret_key IS NOT NULL THEN
                -- HMAC-SHA256(order_id + "|" + payment_id, secret)
                v_generated_signature := encode(extensions.hmac(p_gateway_order_id || '|' || p_gateway_payment_id, v_secret_key, 'sha256'), 'hex');
                
                IF v_generated_signature != p_gateway_signature THEN
                    RETURN json_build_object('success', false, 'error', 'Security Alert: Invalid Razorpay Signature');
                END IF;
            ELSE
                -- Keep legacy behavior if no key configured? No, Secure by default.
                RETURN json_build_object('success', false, 'error', 'Razorpay secret not configured on server');
            END IF;
        END IF;
    END IF;

    -- 2.5 Calculate Settlement Data (For Platform Mode)
    DECLARE
        v_payment_mode_config TEXT;
        v_platform_fee DECIMAL := 0;
        v_vendor_payout DECIMAL := 0;
        v_settlement_status TEXT := 'COMPLETED'; -- Default for OWN mode
    BEGIN
        SELECT payment_mode INTO v_payment_mode_config FROM admins WHERE id = p_admin_id;
        
        IF v_payment_mode_config = 'PLATFORM' THEN
            -- Logic: 2% Platform Fee
            v_platform_fee := ROUND((p_amount * 0.02), 2);
            v_vendor_payout := p_amount - v_platform_fee;
            v_settlement_status := 'PENDING';
        END IF;

        -- 3. Insert into payments table
        INSERT INTO public.payments (
            invoice_id,
            tenure_id,
            admin_id,
            gateway_name,
            gateway_payment_id,
            gateway_order_id,
            gateway_signature,
            order_amount,
            payment_mode,
            payment_status,
            customer_id,
            customer_name,
            customer_email,
            payment_message,
            payment_time,
            platform_fee,
            vendor_payout,
            settlement_status
        ) VALUES (
            p_invoice_id,
            p_tenure_id,
            p_admin_id,
            p_gateway_name,
            p_gateway_payment_id,
            p_gateway_order_id,
            p_gateway_signature,
            p_amount,
            p_payment_mode,
            'SUCCESS',
            p_tenure_id::text,
            p_customer_name,
            p_customer_email,
            'Payment Verified & Secured',
            timezone('utc'::text, now()),
            v_platform_fee,
            v_vendor_payout,
            v_settlement_status
        )
        RETURNING id INTO new_payment_id;
    END;

    -- 4. Update Invoice Status to PAID
    UPDATE public.invoices
    SET status = 'paid'
    WHERE id = p_invoice_id;

    -- 5. Return success
    RETURN json_build_object(
        'success', true,
        'payment_id', new_payment_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
