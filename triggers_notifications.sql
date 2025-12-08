-- Trigger Function for New Invoices
create or replace function notify_on_new_invoice()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into notifications (user_id, title, message, type, link)
  values (NEW.tenure_id, 'New Invoice', 'A new invoice for ' || NEW.month || ' has been generated.', 'info', '/tenure/payments');
  return NEW;
end;
$$;

create trigger on_invoice_created
after insert on invoices
for each row execute function notify_on_new_invoice();


-- Trigger Function for Message Received
create or replace function notify_on_new_message()
returns trigger
language plpgsql
security definer
as $$
declare
  sender_name text;
begin
  -- Try to get sender name from admins or tenures
  select full_name into sender_name from admins where id = NEW.sender_id;
  if sender_name is null then
    select full_name into sender_name from tenures where id = NEW.sender_id;
  end if;
  
  if sender_name is null then
    sender_name := 'Someone';
  end if;

  insert into notifications (user_id, title, message, type, link)
  values (NEW.receiver_id, 'New Message', 'You have a new message from ' || sender_name, 'info', '/tenure/messages');
  return NEW;
end;
$$;

create trigger on_message_received
after insert on messages
for each row execute function notify_on_new_message();


-- Trigger Function for Maintenance Status Update
create or replace function notify_on_complaint_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if OLD.status <> NEW.status then
    insert into notifications (user_id, title, message, type, link)
    values (NEW.tenure_id, 'Complaint Update', 'Your complaint "' || NEW.title || '" status is now ' || NEW.status, 'info', '/tenure/complaints');
  end if;
  return NEW;
end;
$$;

create trigger on_complaint_status_change
after update on complaints
for each row execute function notify_on_complaint_update();


-- Trigger Function for New Tenure (Welcome) and Roommates
create or replace function notify_on_new_tenure()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Notify the new tenant (Welcome)
  if NEW.status = 'active' and (OLD.status is null or OLD.status <> 'active') then
     insert into notifications (user_id, title, message, type, link)
     values (NEW.id, 'Welcome to Nestify', 'Your tenure is now active. Welcome aboard!', 'success', '/tenure');
     
     -- Notify existing roommates
     if NEW.room_id is not null then
       insert into notifications (user_id, title, message, type, link)
       select id, 'New Roommate', 'Say hello to your new roommate, ' || NEW.full_name || '!', 'info', '/tenure/roommates'
       from tenures
       where room_id = NEW.room_id and id <> NEW.id and status = 'active';
     end if;
  end if;

  -- Also handle case where room_id changes (move room) ?? 
  -- For now just handle activation or new active insert.
  return NEW;
end;
$$;

create trigger on_tenure_activated
after insert or update on tenures
for each row execute function notify_on_new_tenure();
