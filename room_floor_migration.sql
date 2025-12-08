-- Add floor_number column to rooms table
alter table public.rooms 
add column if not exists floor_number int DEFAULT 0;

-- Optional: Add a comment explaining the default
comment on column public.rooms.floor_number is 'Floor number: 0 = Ground, 1 = First, etc.';
