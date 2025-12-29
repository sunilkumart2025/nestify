-- Fix RLS and Permissions for Multi-Hostel Architecture

-- 1. Ensure Hostels Table Exists and has RLS
CREATE TABLE IF NOT EXISTS public.hostels (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;

-- 2. Reset Policies for Hostels (Drop to avoid duplicates/conflicts)
DROP POLICY IF EXISTS "Admins can manage their own hostels" ON public.hostels;
DROP POLICY IF EXISTS "Admins can insert their own hostels" ON public.hostels;
DROP POLICY IF EXISTS "Admins can select their own hostels" ON public.hostels;
DROP POLICY IF EXISTS "Admins can update their own hostels" ON public.hostels;
DROP POLICY IF EXISTS "Admins can delete their own hostels" ON public.hostels;

-- 3. Create Comprehensive Policies for Hostels
-- Allow all actions if the user is the admin of the hostel
CREATE POLICY "Admins can manage their own hostels"
    ON public.hostels
    FOR ALL
    USING (auth.uid() = admin_id)
    WITH CHECK (auth.uid() = admin_id);

-- 4. Ensure Admins Table has correct RLS (Crucial for FK checks and self-healing)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies on admins
DROP POLICY IF EXISTS "Admins can view own profile" ON public.admins;
DROP POLICY IF EXISTS "Admins can update own profile" ON public.admins;

-- Create standard policies for admins
CREATE POLICY "Admins can view own profile"
    ON public.admins
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can update own profile"
    ON public.admins
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can insert own profile"
    ON public.admins
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Grant Permissions to Authenticated Users
GRANT ALL ON public.hostels TO authenticated;
GRANT ALL ON public.admins TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Fix for "permission denied for table users"
-- Sometimes FK checks against auth.users fail if not handled correctly.
-- We can't grant access to auth.users, but ensuring the public tables are accessible usually fixes it.
-- If the error persists, it might be a trigger. We already checked triggers and they are SECURITY DEFINER.

-- 7. Verify/Create the Trigger for Auto-Creation (Just in case it wasn't run)
CREATE OR REPLACE FUNCTION public.handle_new_admin_hostel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.hostel_name IS NOT NULL AND NEW.hostel_name != '' THEN
        INSERT INTO public.hostels (admin_id, name, address, phone)
        VALUES (NEW.id, NEW.hostel_name, COALESCE(NEW.hostel_address, ''), COALESCE(NEW.phone, ''))
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_created_create_hostel ON public.admins;
CREATE TRIGGER on_admin_created_create_hostel
    AFTER INSERT ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_admin_hostel();
