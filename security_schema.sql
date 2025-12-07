
-- 1. Create Audit Logs Table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade, -- Optional: Link to admin if applicable
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- e.g., "LOGIN", "PAYMENT_SUCCESS", "DELETE_ROOM"
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Audit Logs
alter table public.audit_logs enable row level security;

-- Policies:
-- Admins can view own logs (or logs where they are the 'admin_id')
create policy "Admins can view their audit logs" on public.audit_logs
  for select using (auth.uid() = admin_id);

-- System can insert (handled by RPC usually, or public insert if restricted)
-- For simplicity, we'll allow authenticated users to insert their *own* actions
create policy "Users can insert own logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);


-- 2. Enhanced Session Management
-- We will attach this metadata to the existing 'public.tenures' and 'public.admins' tables 
-- OR create a separate 'user_status' table. A separate table is cleaner for mixed roles.

create table public.user_sessions (
  user_id uuid references auth.users(id) on delete cascade primary key,
  current_session_token text, -- Store a unique ID for the current valid session
  last_active_page text, -- e.g., '/tenure/payments'
  last_active_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_sessions enable row level security;

-- Policies
create policy "Users can view and update own session" on public.user_sessions
  for all using (auth.uid() = user_id);

-- 3. Trigger or RPC to handle "Log Activity"
-- It's often easier to call this from the frontend or existing RPCs.

