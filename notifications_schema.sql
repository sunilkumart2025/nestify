-- Create Notifications Table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  message text not null,
  type text check (type in ('info', 'success', 'warning', 'error')) default 'info',
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Allow system/admins to insert notifications (broad for now to allow triggers)
create policy "System can insert notifications"
  on notifications for insert
  with check (true);

-- Create index for performance
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_is_read_idx on notifications(is_read);

-- RPC to mark all as read
create or replace function mark_all_notifications_as_read()
returns void
language plpgsql
security definer
as $$
begin
  update notifications
  set is_read = true
  where user_id = auth.uid() and is_read = false;
end;
$$;
