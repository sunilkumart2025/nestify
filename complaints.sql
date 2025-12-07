-- Create complaints table
create table complaints (
  id uuid default uuid_generate_v4() primary key,
  tenure_id uuid references tenures(id) on delete cascade not null,
  admin_id uuid references admins(id) on delete cascade not null,
  title text not null,
  description text not null,
  status text check (status in ('open', 'in_progress', 'resolved')) default 'open',
  priority text check (priority in ('low', 'medium', 'high', 'emergency')) default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table complaints enable row level security;

-- Policies

-- Tenures can view their own complaints
create policy "Tenures can view their own complaints"
  on complaints for select
  using (auth.uid() = tenure_id);

-- Tenures can insert their own complaints
create policy "Tenures can insert their own complaints"
  on complaints for insert
  with check (auth.uid() = tenure_id);

-- Admins can view complaints assigned to them
create policy "Admins can view complaints assigned to them"
  on complaints for select
  using (auth.uid() = admin_id);

-- Admins can update status of complaints assigned to them
create policy "Admins can update complaints assigned to them"
  on complaints for update
  using (auth.uid() = admin_id);
