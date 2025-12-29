create table if not exists public.user_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  current_session_token text,
  updated_at timestamptz default now()
);

alter table public.user_sessions enable row level security;

-- Policies
create policy "Users can see own session" on public.user_sessions for select using (auth.uid() = user_id);
create policy "Users can update own session" on public.user_sessions for update using (auth.uid() = user_id);
create policy "Users can insert own session" on public.user_sessions for insert with check (auth.uid() = user_id);

-- Index
create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);
