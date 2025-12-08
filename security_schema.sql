-- Comprehensive Security Schema for Audit Logs

-- 1. Create Audit Logs Table (if not exists)
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- e.g., "PAYMENT_RECEIVED", "INVOICE_CREATED"
  entity_type text, -- e.g., "payment", "invoice", "room"
  entity_id text, -- ID of the affected row
  details jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policies
create policy "Admins can view own audit logs" on public.audit_logs
  for select using (
    admin_id = auth.uid() 
    or admin_id in (select admin_id from tenures where id = auth.uid()) -- Maybe allow tenants to see relevant logs? For now, stick to admin.
  );
  
create policy "System can insert logs" on public.audit_logs
  for insert with check (true); -- Triggers need this

-- 2. Function to Log Activity (Wrapper)
create or replace function log_activity(
    p_admin_id uuid,
    p_user_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id text,
    p_details jsonb
) returns void as $$
begin
    insert into public.audit_logs (admin_id, user_id, action, entity_type, entity_id, details)
    values (p_admin_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details);
end;
$$ language plpgsql security definer;


-- 3. Automatic Triggers for Critical Tables

-- Trigger for Invoices (Creation & Status Change)
create or replace function log_invoice_changes() returns trigger as $$
begin
    if (TG_OP = 'INSERT') then
        perform log_activity(NEW.admin_id, auth.uid(), 'INVOICE_CREATED', 'invoice', NEW.id::text, json_build_object('amount', NEW.total_amount, 'month', NEW.month)::jsonb);
        return NEW;
    elsif (TG_OP = 'UPDATE') then
        if (OLD.status != NEW.status) then
             perform log_activity(NEW.admin_id, auth.uid(), 'INVOICE_STATUS_CHANGED', 'invoice', NEW.id::text, json_build_object('old_status', OLD.status, 'new_status', NEW.status)::jsonb);
        end if;
        return NEW;
    end if;
    return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_invoice_change on invoices;
create trigger on_invoice_change
after insert or update on invoices
for each row execute function log_invoice_changes();

-- Trigger for Payments (Success)
create or replace function log_payment_success() returns trigger as $$
begin
    perform log_activity(NEW.admin_id, NEW.tenure_id, 'PAYMENT_RECEIVED', 'payment', NEW.id::text, json_build_object('amount', NEW.order_amount, 'mode', NEW.payment_mode)::jsonb);
    return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_payment_success on payments;
create trigger on_payment_success
after insert on payments
for each row execute function log_payment_success();

-- Trigger for Room Deletion (Critical)
create or replace function log_room_deletion() returns trigger as $$
begin
    perform log_activity(OLD.admin_id, auth.uid(), 'ROOM_DELETED', 'room', OLD.id::text, json_build_object('room_number', OLD.room_number)::jsonb);
    return OLD;
end;
$$ language plpgsql security definer;

drop trigger if exists on_room_delete on rooms;
create trigger on_room_delete
after delete on rooms
for each row execute function log_room_deletion();
