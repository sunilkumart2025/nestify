-- Enable the HTTP extension (Required for making API calls from Postgres)
create extension if not exists http with schema extensions;

-- Create a secure function to generate Cashfree Order Session
create or replace function create_cashfree_order(
  p_invoice_id text,
  p_amount numeric,
  p_customer_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_admin_id uuid,
  p_return_url text
)
returns json
language plpgsql
security definer
as $$
declare
  v_app_id text;
  v_secret_key text;
  v_api_url text := 'https://sandbox.cashfree.com/pg/orders';
  v_order_id text;
  v_response_status integer;
  v_response_body text;
  v_result json;
begin
  -- 1. Fetch Keys
  select cashfree_app_id, cashfree_secret_key
  into v_app_id, v_secret_key
  from admins
  where id = p_admin_id;

  if v_app_id is null or v_secret_key is null then
    return json_build_object('success', false, 'message', 'Cashfree keys not configured by Admin');
  end if;

  -- 2. Validate & Sanitize Phone
  p_customer_phone := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  if length(p_customer_phone) > 10 then
     p_customer_phone := right(p_customer_phone, 10);
  end if;
  if p_customer_phone is null or length(p_customer_phone) < 10 then
     p_customer_phone := '9876543210'; 
  end if;

  p_customer_id := 'CUST_' || regexp_replace(p_customer_id, '-', '', 'g');
  -- Ensure Order ID is < 50 chars (Cashfree Limit)
  -- Format: ord_{8_char_uuid}_{epoch}
  v_order_id := 'ord_' || substring(p_invoice_id, 1, 8) || '_' || floor(extract(epoch from now()));

  -- 4. Make HTTP Request
  select status, content::text
  into v_response_status, v_response_body
  from extensions.http((
    'POST',
    v_api_url,
    ARRAY[
      extensions.http_header('x-client-id', v_app_id),
      extensions.http_header('x-client-secret', v_secret_key),
      extensions.http_header('x-api-version', '2023-08-01'), -- RESTORE LATEST VERSION
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'order_id', v_order_id,
      'order_amount', p_amount,
      'order_currency', 'INR',
      'customer_details', json_build_object(
        'customer_id', p_customer_id,
        'customer_name', p_customer_name,
        'customer_email', p_customer_email,
        'customer_phone', p_customer_phone
      ),
      'order_meta', json_build_object(
         'return_url', p_return_url
      )
    )::text
  ));

  -- 4. Handle Response
  if v_response_status between 200 and 299 then
    v_result := v_response_body::json;
    return json_build_object(
      'success', true, 
      'payment_session_id', v_result->>'payment_session_id',
      'payment_link', v_result->'payments'->>'url', -- Try to get link if available
      'order_id', v_order_id
    );
  else
    return json_build_object('success', false, 'message', 'Cashfree API Error: ' || v_response_body);
  end if;

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;


