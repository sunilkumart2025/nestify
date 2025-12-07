-- Create a secure function to generate Razorpay Order (Tests Credentials)
-- This function proves that BOTH Key ID and Key Secret are valid by making a server-side call.

create or replace function create_razorpay_order(
  p_amount numeric, -- Amount in INR (will be converted to paise)
  p_admin_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_key_id text;
  v_key_secret text;
  v_api_url text := 'https://api.razorpay.com/v1/orders';
  v_auth_header text;
  v_response_status integer;
  v_response_body text;
  v_result json;
begin
  -- 1. Fetch Keys
  select razorpay_key_id, razorpay_key_secret
  into v_key_id, v_key_secret
  from admins
  where id = p_admin_id;

  if v_key_id is null or v_key_secret is null then
    return json_build_object('success', false, 'message', 'Razorpay keys not configured');
  end if;

  -- 2. Construct Basic Auth Header
  v_auth_header := 'Basic ' || encode((v_key_id || ':' || v_key_secret)::bytea, 'base64');

  -- 3. Make HTTP Request
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
      'amount', (p_amount * 100)::integer, -- Convert to paise
      'currency', 'INR',
      'receipt', 'test_verification_' || floor(extract(epoch from now())),
      'payment_capture', 1
    )::text
  ));

  -- 4. Handle Response
  if v_response_status between 200 and 299 then
    v_result := v_response_body::json;
    return json_build_object(
      'success', true, 
      'order_id', v_result->>'id',
      'key_id', v_key_id -- Return key_id so frontend can initialize SDK
    );
  else
    return json_build_object('success', false, 'message', 'Razorpay API Error: ' || v_response_body);
  end if;

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;
