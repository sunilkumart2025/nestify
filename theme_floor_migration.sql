-- 1. Alter floor_number to text (migration from int to string)
ALTER TABLE public.rooms 
ALTER COLUMN floor_number TYPE text USING floor_number::text;

-- 2. Add Theme Column to Admins
ALTER TABLE public.admins
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'nestify-light';

-- 3. Add Theme Column to Tenures
ALTER TABLE public.tenures
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'nestify-light';
