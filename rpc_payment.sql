-- Secure Function to record a successful payment and update the invoice
-- This runs with SECURITY DEFINER privileges to ensure the Invoice status can be updated
-- even if the Tenant user doesn't have direct UPDATE permission on the table.

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
BEGIN
    -- 1. Insert into payments table
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
        payment_time
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
        'Payment Verified Successfully',
        timezone('utc'::text, now())
    )
    RETURNING id INTO new_payment_id;

    -- 2. Update Invoice Status to PAID
    UPDATE public.invoices
    SET status = 'paid'
    WHERE id = p_invoice_id;

    -- 3. Return success
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
