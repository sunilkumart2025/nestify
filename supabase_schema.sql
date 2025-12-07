-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create app_config table for system-wide settings
create table public.app_config (
  key text primary key,
  value text not null
);

-- Insert default NestKey (Website Owner Key)
insert into public.app_config (key, value) values ('nest_key', 'NESTIFY2025')
on conflict (key) do nothing;

-- Create admins table
create table public.admins (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  hostel_name text,
  hostel_address text,
  phone text,
  razorpay_key_id text,
  razorpay_key_secret text,
  cashfree_app_id text,
  cashfree_secret_key text,
  stay_key text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create rooms table
create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  room_number text not null,
  capacity int not null,
  type text check (type in ('AC', 'Non-AC', 'Dormitory')),
  price decimal not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tenures table
create table public.tenures (
  id uuid references auth.users on delete cascade primary key,
  admin_id uuid references public.admins(id) on delete cascade not null,
  full_name text,
  email text,
  phone text,
  room_id uuid references public.rooms(id) on delete set null,
  status text check (status in ('pending', 'active')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invoices table (The Bill)
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  tenure_id uuid references public.tenures(id) on delete cascade not null,
  admin_id uuid references public.admins(id) on delete cascade not null,
  month text not null, -- e.g., "October"
  year int not null, -- e.g., 2023
  status text check (status in ('pending', 'paid', 'cancelled')) default 'pending',
  
  -- Breakdown of the bill
  items jsonb not null default '[]'::jsonb, -- [{ "description": "Rent", "amount": 5000 }, { "description": "EB", "amount": 200 }]
  subtotal decimal not null, -- Sum of items
  
  -- Platform Fees (Calculated at generation)
  fixed_fee decimal default 20,
  platform_share_percent decimal default 0.006,
  platform_share_amount decimal,
  maintenance_share_percent decimal default 0.002,
  maintenance_share_amount decimal,
  support_share_percent decimal default 0.0015,
  support_share_amount decimal,
  development_share_percent decimal default 0.0005,
  development_share_amount decimal,
  gateway_fee_percent decimal default 0.0015,
  gateway_fee_amount decimal,
  
  total_platform_fee decimal, -- Sum of all fees
  total_amount decimal not null, -- Final payable amount
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table (The Payment Attempt)
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  
  -- Gateway Details
  gateway_provider text check (gateway_provider in ('razorpay', 'cashfree')),
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  
  -- Payment Details
  amount decimal not null,
  currency text default 'INR',
  status text check (status in ('created', 'success', 'failed')) default 'created',
  payment_method text, -- UPI, CARD, NETBANKING
  
  -- Meta
  raw_response jsonb, -- Store full webhook payload for audit
  error_message text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admins enable row level security;
alter table public.rooms enable row level security;
alter table public.tenures enable row level security;
alter table public.invoices enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;
alter table public.app_config enable row level security;

-- Policies

-- App Config: Public read (for checking keys), No write
create policy "Allow public read of app_config" on public.app_config for select using (true);

-- Admins: Users can view their own profile
create policy "Admins can view own profile" on public.admins for select using (auth.uid() = id);
create policy "Admins can update own profile" on public.admins for update using (auth.uid() = id);
create policy "Admins can insert own profile" on public.admins for insert with check (auth.uid() = id);

-- Rooms: Admins can manage their own rooms. Tenures can view rooms in their hostel.
create policy "Admins can manage own rooms" on public.rooms for all using (auth.uid() = admin_id);
create policy "Tenures can view rooms" on public.rooms for select using (
  exists (select 1 from public.tenures where id = auth.uid() and admin_id = rooms.admin_id)
);

-- Tenures: Admins can view/manage tenures in their hostel. Tenures can view own profile.
create policy "Admins can manage their tenures" on public.tenures for all using (auth.uid() = admin_id);
create policy "Tenures can view own profile" on public.tenures for select using (auth.uid() = id);
create policy "Tenures can update own profile" on public.tenures for update using (auth.uid() = id);
create policy "Tenures can insert own profile" on public.tenures for insert with check (auth.uid() = id);

-- Invoices: Admins can manage invoices for their hostel. Tenures can view their own invoices.
create policy "Admins can manage invoices" on public.invoices for all using (auth.uid() = admin_id);
create policy "Tenures can view own invoices" on public.invoices for select using (auth.uid() = tenure_id);

-- Transactions: Admins can view transactions. Tenures can view their own transactions (via invoice).
create policy "Admins can view transactions" on public.transactions for select using (
  exists (select 1 from public.invoices where id = transactions.invoice_id and admin_id = auth.uid())
);
create policy "Tenures can view own transactions" on public.transactions for select using (
  exists (select 1 from public.invoices where id = transactions.invoice_id and tenure_id = auth.uid())
);

-- Messages: Users can view messages sent to or by them.
create policy "Users can view own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);
