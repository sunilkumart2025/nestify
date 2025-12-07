-- Fix RLS policies to allow Tenants to view their Hostel/Admin details and Notices

-- 1. Allow Tenants to view their linked Admin's details (Hostel Name, Address, Phone, etc.)
-- Drop existing policy if it conflicts or is too narrow (though likely none exists for tenants)
drop policy if exists "Tenants can view their linked admin" on public.admins;

create policy "Tenants can view their linked admin"
  on public.admins
  for select
  using (
    id in (
      select admin_id from public.tenures where id = auth.uid()
    )
  );

-- 2. Ensure Notices table exists and has correct policies
-- (Re-defining policy to ensure it works)
create table if not exists public.notices (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text check (category in ('general', 'maintenance', 'event', 'urgent')) default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notices enable row level security;

-- Verify/Re-create Notice policies
drop policy if exists "Tenures can view notices from their admin" on public.notices;

create policy "Tenures can view notices from their admin"
  on public.notices
  for select
  using (
    admin_id in (
      select admin_id from public.tenures where id = auth.uid()
    )
  );

-- Admin policies for Notices (Ensure Admins can manage them)
drop policy if exists "Admins can view their own notices" on public.notices;
drop policy if exists "Admins can insert their own notices" on public.notices;
drop policy if exists "Admins can delete their own notices" on public.notices;

create policy "Admins can view their own notices" on public.notices for select using (auth.uid() = admin_id);
create policy "Admins can insert their own notices" on public.notices for insert with check (auth.uid() = admin_id);
create policy "Admins can delete their own notices" on public.notices for delete using (auth.uid() = admin_id);
