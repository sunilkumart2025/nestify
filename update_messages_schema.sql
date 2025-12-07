-- Ensure messages table has 'is_read' column
alter table public.messages add column if not exists is_read boolean default false;

-- Create index for faster unread count queries
create index if not exists idx_messages_unread on public.messages(receiver_id, is_read);

-- If there was a 'read' column from older schema, migrate it (optional safety)
do $$
begin
  if exists(select 1 from information_schema.columns where table_name = 'messages' and column_name = 'read') then
    update public.messages set is_read = read where is_read is false;
  end if;
end $$;
