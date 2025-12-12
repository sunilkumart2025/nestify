
-- Enable HTTP extension (Better for Form-URL-Encoded requests than pg_net)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Ensure the search path includes extensions
-- You might need to check if 'extensions' schema exists or just use public
-- We will try `CREATE EXTENSION IF NOT EXISTS http;` generally.

-- Helper: URL Encode function (Postgres doesn't have this by default for body construction)
CREATE OR REPLACE FUNCTION urlencode(in_str text) RETURNS text AS $$
DECLARE
    i integer;
    out_str text := '';
    curr_char varchar;
    curr_ascii integer;
BEGIN
    FOR i IN 1..length(in_str) LOOP
        curr_char := substring(in_str FROM i FOR 1);
        curr_ascii := ascii(curr_char);
        IF (curr_ascii BETWEEN 48 AND 57) OR -- 0-9
           (curr_ascii BETWEEN 65 AND 90) OR -- A-Z
           (curr_ascii BETWEEN 97 AND 122) OR -- a-z
           (curr_char = '-') OR (curr_char = '_') OR 
           (curr_char = '.') OR (curr_char = '~') THEN
            out_str := out_str || curr_char;
        ELSE
            out_str := out_str || '%' || to_hex(curr_ascii);
        END IF;
    END LOOP;
    RETURN out_str;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Central Platform Configuration
CREATE TABLE IF NOT EXISTS platform_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    twilio_account_sid text,
    twilio_auth_token text,
    twilio_from_number text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Insert placeholder if empty
INSERT INTO platform_config (twilio_account_sid, twilio_auth_token, twilio_from_number)
SELECT 'AC_PLACEHOLDER', 'AUTH_TOKEN_PLACEHOLDER', 'whatsapp:+14155238886'
WHERE NOT EXISTS (SELECT 1 FROM platform_config);

-- RPC: Send WhatsApp Message via Twilio (Real HTTP Call via pgsql-http)
CREATE OR REPLACE FUNCTION send_whatsapp_notification(
    p_phone text,
    p_message text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_url text;
    v_body text;
    v_response_status integer;
    v_response_content text;
    v_auth_header text;
BEGIN
    -- 1. Get Platform Config
    SELECT * INTO v_config FROM platform_config LIMIT 1;
    
    IF v_config.twilio_account_sid IS NULL OR v_config.twilio_auth_token IS NULL THEN
        RETURN json_build_object('status', 'error', 'message', 'Platform credentials missing');
    END IF;

    -- 2. Format Phone (Ensure E.164)
    p_phone := trim(p_phone);
    IF length(p_phone) = 10 THEN
        p_phone := '+91' || p_phone;
    ELSIF position('+' in p_phone) = 0 THEN
        p_phone := '+' || p_phone;
    END IF;
    
    IF position('whatsapp:' in p_phone) = 0 THEN
       p_phone := 'whatsapp:' || p_phone;
    END IF;

    -- Basic Auth: Base64(sid:token)
    -- IMPORTANT: 'encode' with base64 can insert newlines. We must strip them.
    v_auth_header := 'Basic ' || replace(encode(convert_to(v_config.twilio_account_sid || ':' || v_config.twilio_auth_token, 'utf8'), 'base64'), E'\n', '');

    -- 3. Prepare URL
    v_url := 'https://api.twilio.com/2010-04-01/Accounts/' || v_config.twilio_account_sid || '/Messages.json';

    -- 4. Construct x-www-form-urlencoded Body
    v_body := 'From=' || urlencode(v_config.twilio_from_number) 
           || '&To=' || urlencode(p_phone) 
           || '&Body=' || urlencode(p_message);

    -- 5. Send Real HTTP Request (Synchronous)
    -- Using the 'http' extension's generic request function or http_post
    -- Ref: select * from http((method, url, headers, content, ...));
    
    SELECT status, content::text INTO v_response_status, v_response_content
    FROM http((
        'POST', 
        v_url, 
        ARRAY[
            http_header('Authorization', v_auth_header),
            http_header('Content-Type', 'application/x-www-form-urlencoded')
        ],
        'application/x-www-form-urlencoded',
        v_body
    )::http_request);

    -- 6. Log Result
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        auth.uid(), 
        CASE WHEN v_response_status BETWEEN 200 AND 299 THEN 'WhatsApp Sent 🚀' ELSE 'WhatsApp Failed ❌' END, 
        'To: ' || p_phone || E'\nStatus: ' || v_response_status || E'\nTwilio: ' || substring(v_response_content from 1 for 100),
        CASE WHEN v_response_status BETWEEN 200 AND 299 THEN 'success' ELSE 'error' END
    );

    IF v_response_status NOT BETWEEN 200 AND 299 THEN
         RETURN json_build_object('status', 'error', 'message', 'Twilio Error: ' || v_response_content);
    END IF;

    RETURN json_build_object('status', 'success', 'message', 'Message dispatched', 'twilio_response', v_response_content);
    
EXCEPTION WHEN OTHERS THEN
    -- Fallback if HTTP extension is missing or fails hard
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (auth.uid(), 'System Error', 'Twilio Call Failed: ' || SQLERRM, 'error');
    
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;
