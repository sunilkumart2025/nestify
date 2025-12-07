
-- 1. Enable Realtime for user_sessions
-- Check if publication exists, if not create it (standard supabase setup usually has it)
-- We add the table to the publication explicitly.
alter publication supabase_realtime add table public.user_sessions;

-- 2. Ensure Replica Identity is Full (good for utilizing realtime updates properly)
alter table public.user_sessions replica identity full;

-- 3. Fix RLS for user_sessions
drop policy if exists "Users can view and update own session" on public.user_sessions;

create policy "Users can select own session" on public.user_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own session" on public.user_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own session" on public.user_sessions
  for update using (auth.uid() = user_id);

-- 4. Fix RLS for audit_logs
drop policy if exists "Users can insert own logs" on public.audit_logs;

create policy "Users can insert own logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);

-- 5. Grant permissions (just in case)
grant all on public.user_sessions to authenticated;
grant all on public.audit_logs to authenticated;

-- 6. Create RPC for cleaner logging (Advanced Version: Server-side logging)
create or replace function log_activity(
  p_action text,
  p_details jsonb default '{}'::jsonb
) returns void as $$
begin
  insert into public.audit_logs (user_id, action, details)
  values (auth.uid(), p_action, p_details);
end;
$$ language plpgsql security definer;

-- 7. Create RPC for Session Enforcement (Server-side upsert)
create or replace function update_session(
  p_session_token text,
  p_page text default null
) returns void as $$
begin
  insert into public.user_sessions (user_id, current_session_token, last_active_page, updated_at)
  values (auth.uid(), p_session_token, p_page, now())
  on conflict (user_id) do update
  set 
    current_session_token = excluded.current_session_token,
    last_active_page = coalesce(excluded.last_active_page, user_sessions.last_active_page),
    updated_at = now();
end;
$$ language plpgsql security definer;
