
-- Add amenities column to rooms table
alter table public.rooms 
add column if not exists amenities jsonb default '[]'::jsonb;

-- Ensure RLS allows update (already covers it usually, but verifying)
-- Policy "Admins can update their own rooms" should exist.
