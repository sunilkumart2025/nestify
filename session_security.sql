-- Session Fortress Protocol
-- Advanced Device Tracking & Security

-- 1. User Devices Table
-- Tracks unique devices/browsers used by a user
create table if not exists public.user_devices (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    device_name text not null, -- e.g. "Chrome on Windows"
    ip_address text,
    location text, -- e.g. "Mumbai, India" (approx)
    last_active timestamptz default now(),
    is_trusted boolean default true,
    first_seen_at timestamptz default now(),
    
    constraint unique_device_per_user unique (user_id, device_name, ip_address)
);

-- Enable RLS
alter table public.user_devices enable row level security;

create policy "Users can view their own devices"
    on public.user_devices for select
    using (auth.uid() = user_id);

create policy "Users can update their own devices" -- e.g. to untrust
    on public.user_devices for update
    using (auth.uid() = user_id);

-- 2. RPC to Register Login
-- Called by client on app mount
create or replace function register_device_login(
    p_device_name text,
    p_ip_address text,
    p_location text default 'Unknown'
)
returns void
language plpgsql
security definer
as $$
declare
    v_device_id uuid;
    v_is_new boolean := false;
begin
    -- Upsert device: Update last_active if exists, else Insert
    insert into public.user_devices (user_id, device_name, ip_address, location, last_active)
    values (auth.uid(), p_device_name, p_ip_address, p_location, now())
    on conflict (user_id, device_name, ip_address) 
    do update set last_active = now(), location = EXCLUDED.location
    returning id, (xmax = 0) into v_device_id, v_is_new; 
    -- xmax = 0 means insert happened (Postgres trick)
    
    -- If purely new insert (xmax=0 checks are tricky in plpgsql with returning, let's use a simpler check)
    -- Actually `on conflict` works, but detecting 'new' is harder.
    -- Let's check `first_seen_at`. If `last_active` was old, we just updated.
    
    -- Improved Logic:
    -- If the `xmax` logic is flaky, we can check if `created_at` ~= `now()` but `created_at` is `first_seen_at`.
    
end;
$$;

-- Refined RPC with explicit check for notification
create or replace function register_device_login(
    p_device_name text,
    p_ip_address text,
    p_location text default 'Unknown'
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_exists boolean;
begin
    -- Check if device exists
    select exists(
        select 1 from public.user_devices 
        where user_id = auth.uid() 
        and device_name = p_device_name 
        and ip_address = p_ip_address
    ) into v_exists;

    -- Update or Insert
    insert into public.user_devices (user_id, device_name, ip_address, location, last_active)
    values (auth.uid(), p_device_name, p_ip_address, p_location, now())
    on conflict (user_id, device_name, ip_address) 
    do update set last_active = now(), location = EXCLUDED.location;

    -- Return status for UI
    return json_build_object('is_new', not v_exists);
end;
$$;


-- 3. Trigger for New Device Alert
-- If a new row is inserted into user_devices, warn the user
create or replace function notify_on_new_device()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into notifications (user_id, title, message, type, link)
    values (
        NEW.user_id, 
        'New Login Detected', 
        'We noticed a new login from ' || NEW.device_name || ' (' || coalesce(NEW.ip_address, 'IP Unknown') || '). If this was not you, please secure your account immediately.', 
        'warning', 
        '/admin/profile' -- Link to profile to review devices
    );
    return NEW;
end;
$$;

create trigger on_new_device_detected
after insert on public.user_devices
for each row execute function notify_on_new_device();

-- 4. RPC to Revoke/Untrust Device (Simulated Kill Switch)
-- This sets `is_trusted` to false. 
-- Real security would require checking this table in every RLS policy, which is heavy.
-- For now, this is an AUDIT feature.
create or replace function untrust_device(p_device_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    update public.user_devices
    set is_trusted = false
    where id = p_device_id and user_id = auth.uid();
end;
$$;

-- Permissions
grant usage on schema public to authenticated;
grant all on public.user_devices to service_role;
grant select, insert, update on public.user_devices to authenticated;

grant execute on function register_device_login to authenticated;
grant execute on function untrust_device to authenticated;
