-- Create Badges Table
create table if not exists badges (
    id text primary key,
    name text not null,
    description text not null,
    icon text not null, -- Stores lucide icon name or emoji
    category text check (category in ('payment', 'profile', 'community', 'special')),
    color text default '#6366f1'
);

-- Create User Badges Table
create table if not exists user_badges (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references tenures(id) on delete cascade not null,
    badge_id text references badges(id) on delete cascade not null,
    awarded_at timestamptz default now(),
    unique(user_id, badge_id)
);

-- Enable RLS
alter table badges enable row level security;
alter table user_badges enable row level security;

-- Policies
create policy "Badges are viewable by everyone" on badges for select using (true);
create policy "User badges are viewable by everyone" on user_badges for select using (true);

-- Seed Initial Badges
insert into badges (id, name, description, icon, category, color) values
('early_bird', 'Early Bird', 'Paid rent before due date', 'Zap', 'payment', '#eab308'),
('streak_master', 'Streak Master', '3 Months on-time streak', 'Flame', 'payment', '#f97316'),
('verified_guardian', 'Verified Guardian', 'Profile & 2FA enabled', 'ShieldCheck', 'profile', '#22c55e'),
('digital_native', 'Digital Native', 'Active app usage', 'Smartphone', 'special', '#3b82f6'),
('good_neighbor', 'Good Neighbor', 'Zero complaints record', 'Heart', 'community', '#ec4899')
on conflict (id) do nothing;
