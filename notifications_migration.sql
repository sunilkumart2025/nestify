-- Add is_read column to messages table
alter table messages add column if not exists is_read boolean default false;

-- Enable RLS for update functionality for receivers
create policy "Users can mark messages they received as read"
on messages for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);
