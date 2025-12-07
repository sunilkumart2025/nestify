-- Create OTP Codes table
create table if not exists public.otp_codes (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  code text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- Enable RLS
alter table public.otp_codes enable row level security;

-- Policies
create policy "Allow public insert for OTP"
  on public.otp_codes for insert
  with check (true);

create policy "Allow public select for OTP verification"
  on public.otp_codes for select
  using (true);

-- Function to clean up expired OTPs (optional, can be run manually or via cron)
create or replace function delete_expired_otps()
returns void as $$
begin
  delete from public.otp_codes where expires_at < now();
end;
$$ language plpgsql;
