-- Add NestID verification columns to admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS nestid_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS permanent_address text,
ADD COLUMN IF NOT EXISTS communication_address text,
ADD COLUMN IF NOT EXISTS alt_phone text,
ADD COLUMN IF NOT EXISTS aadhar_number text,
ADD COLUMN IF NOT EXISTS pan_number text,
ADD COLUMN IF NOT EXISTS nestid_verified_at timestamptz;

-- Add NestID verification columns to tenures
ALTER TABLE tenures
ADD COLUMN IF NOT EXISTS nestid_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS aadhar_number text,
ADD COLUMN IF NOT EXISTS nestid_verified_at timestamptz;

-- Add constraint to ensure status is valid
ALTER TABLE admins ADD CONSTRAINT check_nestid_status CHECK (nestid_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE tenures ADD CONSTRAINT check_nestid_status CHECK (nestid_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- RLS Update (Ensure users can see their own sensitive data)
-- admins policies likely already cover "select * using (auth.uid() = id)"
-- tenures policies likely cover "select * using (email = auth.email() or phone = ...)" 
-- Just in case, explicit security is good, but existing row-level policies usually cover new columns on the row.

-- Create a log table for verification attempts (Optional but good for audit)
CREATE TABLE IF NOT EXISTS nestid_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid, -- Link to admin or tenure (polymorphic or just raw uuid)
    user_type text, -- 'admin' or 'tenure'
    doc_type text, -- 'aadhaar', 'pan'
    status text, -- 'success', 'failed'
    response_data jsonb,
    created_at timestamptz DEFAULT now()
);

alter table nestid_logs enable row level security;
-- Only admins/platform can see logs usually
create policy "Admins see own logs" on nestid_logs for select using (auth.uid() = user_id);
