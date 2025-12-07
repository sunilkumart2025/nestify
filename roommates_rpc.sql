
-- Secure Function to get roommates
create or replace function public.get_roommates()
returns table (
    full_name text,
    phone text,
    created_at timestamptz
) 
language plpgsql
security definer
as $$
declare
    current_room_id uuid;
begin
    -- 1. Get the room_id of the current tenant
    select room_id into current_room_id
    from public.tenures
    where id = auth.uid()
    limit 1;

    if current_room_id is null then
        return; -- Return empty if no room assigned
    end if;

    -- 2. Return other tenants in the same room
    return query
    select 
        t.full_name,
        t.phone,
        t.created_at
    from public.tenures t
    where t.room_id = current_room_id
    and t.id != auth.uid() -- Exclude self
    and t.status = 'active';

end;
$$;

-- Grant permission
grant execute on function public.get_roommates() to authenticated;
