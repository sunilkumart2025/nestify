
-- Run this to see the latest Twilio responses
SELECT 
    created_at, 
    title, 
    type, 
    message as twilio_response_or_log
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- COMMON TWILIO ERRORS & SOLUTIONS:

-- 1. "Content is not allowed" / "Structure is invalid"
--    CAUSE: You are trying to send a free-form message but the 24-hour session is not active.
--    FIX (Sandbox): Send "join <your-sandbox-keyword>" to your Twilio Number from your personal WhatsApp.
--    FIX (Production): You MUST use a pre-approved Template.

-- 2. "UNAUTHORIZED" / 401
--    CAUSE: Wrong Account SID or Auth Token in platform_config.

-- 3. "To number: whatsapp:+91... is not a valid mobile number"
--    CAUSE: Recipient number is not Verified (if using Trial account) or Sandbox not joined.

-- 4. "From number is not a valid WhatsApp-enabled number"
--    CAUSE: You put a standard SMS number in 'twilio_from_number' instead of the WhatsApp one.
