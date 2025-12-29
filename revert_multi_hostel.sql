-- Revert Multi-Hostel Architecture
-- This script undoes changes from multi_hostel_migration.sql, update_analytics_rpc.sql, and create_hostel_trigger.sql

-- 1. Drop Triggers and Functions
DROP TRIGGER IF EXISTS on_admin_created_create_hostel ON public.admins;
DROP TRIGGER IF EXISTS on_admin_updated_create_hostel ON public.admins;

DROP FUNCTION IF EXISTS public.handle_new_admin_hostel();
DROP FUNCTION IF EXISTS public.handle_admin_profile_update();
DROP FUNCTION IF EXISTS public.get_hostel_dashboard_stats(uuid);

-- 2. Remove hostel_id from child tables
-- We use a helper block to do this safely
DO $$
BEGIN
    -- Drop columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.rooms DROP COLUMN hostel_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenures' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.tenures DROP COLUMN hostel_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.invoices DROP COLUMN hostel_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.payments DROP COLUMN hostel_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.complaints DROP COLUMN hostel_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.expenses DROP COLUMN hostel_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'hostel_id') THEN
        ALTER TABLE public.community_posts DROP COLUMN hostel_id;
    END IF;
END $$;

-- 3. Drop Hostels Table
DROP TABLE IF EXISTS public.hostels CASCADE;

-- 4. Clean up any indexes (Cascade should handle them, but just in case)
-- (Indexes on dropped columns are automatically dropped)

