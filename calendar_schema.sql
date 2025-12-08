-- Create calendar_events table
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  title text not null,
  description text,
  event_date timestamp with time zone not null,
  event_type text check (event_type in ('meeting', 'maintenance', 'inspection', 'holiday', 'other')) default 'other',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.calendar_events enable row level security;

-- Policies
create policy "Admins can manage own events"
  on public.calendar_events
  for all
  using (auth.uid() = admin_id);

-- Tenants can view events created by their admin
create policy "Tenants can view admin events"
  on public.calendar_events
  for select
  using (
    exists (
      select 1 from public.tenures
      where tenures.id = auth.uid()
      and tenures.admin_id = calendar_events.admin_id
      and tenures.status = 'active'
    )
  );
