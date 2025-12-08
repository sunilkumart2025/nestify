-- Enable Extensions for Crypto and HTTP calls
create extension if not exists pgcrypto with schema extensions;
create extension if not exists http with schema extensions;

-- Function to create Razorpay Order securely from Backend
create or replace function create_razorpay_order(
  p_invoice_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin_id uuid;
  v_amount numeric;
  v_currency text := 'INR';
  v_key_id text;
  v_key_secret text;
  v_api_url text := 'https://api.razorpay.com/v1/orders';
  v_auth_header text;
  v_response_status integer;
  v_response_body text;
  v_result json;
begin
  -- 1. Get Invoice Details & Keys
  select admin_id, total_amount
  into v_admin_id, v_amount
  from invoices
  where id = p_invoice_id;

  if v_admin_id is null then
    return json_build_object('success', false, 'message', 'Invoice not found');
  end if;

  select razorpay_key_id, razorpay_key_secret
  into v_key_id, v_key_secret
  from admins
  where id = v_admin_id;

  if v_key_id is null or v_key_secret is null then
     return json_build_object('success', false, 'message', 'Razorpay keys not configured by Admin');
  end if;

  -- 2. Prepare Auth Header (Basic Auth)
  v_auth_header := 'Basic ' || encode((v_key_id || ':' || v_key_secret)::bytea, 'base64');

  -- 3. Make HTTP Request to Razorpay
  select status, content::text
  into v_response_status, v_response_body
  from extensions.http((
    'POST',
    v_api_url,
    ARRAY[
      extensions.http_header('Authorization', v_auth_header),
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'amount', (v_amount * 100)::int, -- Convert to paise
      'currency', v_currency,
      'receipt', p_invoice_id::text,
      'notes', json_build_object('source', 'nestify_app')
    )::text
  ));

  -- 4. Handle Response
  if v_response_status between 200 and 299 then
    v_result := v_response_body::json;
    return json_build_object(
       'success', true,
       'order_id', v_result->>'id',
       'amount', v_result->>'amount',
       'key_id', v_key_id -- Return key_id for frontend
    );
  else
    return json_build_object('success', false, 'message', 'Razorpay Error: ' || v_response_body);
  end if;

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;
