-- Create notices table
create table notices (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references admins(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text check (category in ('general', 'maintenance', 'event', 'urgent')) default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table notices enable row level security;

-- Policies

-- Admin can see their own notices
create policy "Admins can view their own notices"
  on notices for select
  using (auth.uid() = admin_id);

-- Admin can insert their own notices
create policy "Admins can insert their own notices"
  on notices for insert
  with check (auth.uid() = admin_id);

-- Admin can delete their own notices
create policy "Admins can delete their own notices"
  on notices for delete
  using (auth.uid() = admin_id);

-- Tenures can view notices from their linked admin
create policy "Tenures can view notices from their admin"
  on notices for select
  using (
    admin_id in (
      select admin_id from tenures where id = auth.uid()
    )
  );
