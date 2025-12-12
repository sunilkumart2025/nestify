-- 1. Alter Complaints Table
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS resolved_image text;

-- 2. Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
-- Allow Authenticated Users (Tenants) to Upload
CREATE POLICY "Tenants can upload complaint images 1oj01"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'complaint-images' );

-- Allow Public View
CREATE POLICY "Public Access 1oj02"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'complaint-images' );

-- Allow Admins/Owners to Update (for resolved_image if needed)
CREATE POLICY "Admins can update 1oj03"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'complaint-images' );
