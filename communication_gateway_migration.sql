
-- Add Twilio / Communication Gateway Credentials
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS twilio_account_sid text,
ADD COLUMN IF NOT EXISTS twilio_auth_token text,
ADD COLUMN IF NOT EXISTS twilio_from_number text,
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

-- Enhance RLS (Admin can read/write their own secrets)
-- Existing policies on 'admins' likely cover this, but good to ensure
-- (Assuming standard 'Users can update own profile' policy exists)
