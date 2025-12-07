
-- Fix log_activity to capture admin_id
create or replace function public.log_activity(
  p_action text,
  p_details jsonb default '{}'::jsonb
) returns void as $$
declare
  v_admin_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  -- 1. Check if user is an Admin
  select id into v_admin_id from public.admins where id = v_user_id;
  
  -- 2. If not admin, check if user is a Tenant and get their Admin
  if v_admin_id is null then
    select admin_id into v_admin_id from public.tenures where id = v_user_id;
  end if;

  -- 3. Insert log with linked Admin ID
  insert into public.audit_logs (user_id, admin_id, action, details)
  values (v_user_id, v_admin_id, p_action, p_details);

end;
$$ language plpgsql security definer;
