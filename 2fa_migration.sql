-- Add 2FA column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- Add 2FA column to tenures table
ALTER TABLE tenures 
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;
