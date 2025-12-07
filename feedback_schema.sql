
-- Create Feedback Table
create table if not exists public.feedback (
    id uuid default gen_random_uuid() primary key,
    tenure_id uuid references public.tenures(id) on delete cascade not null,
    admin_id uuid references public.admins(id) on delete cascade, -- Null if target is 'nestify'
    target text check (target in ('nestify', 'hostel')) not null,
    rating integer check (rating >= 1 and rating <= 5) not null,
    category text not null, -- 'general', 'maintenance', 'food', 'staff', 'app_issue', 'feature_request'
    message text,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Policies

-- 1. Tenants can insert feedback
create policy "Tenants can insert feedback"
    on public.feedback for insert
    with check (
        -- Can only insert for their own tenure_id
        auth.uid() = tenure_id
    );

-- 2. Tenants can view their own feedback
create policy "Tenants can view own feedback"
    on public.feedback for select
    using (
        auth.uid() = tenure_id
    );

-- 3. Admins can view feedback directed to their hostel
create policy "Admins can view hostel feedback"
    on public.feedback for select
    using (
        -- Check if user is the admin_id associated with the feedback
        -- Note: Feedback for 'nestify' might not have admin_id set, or we might set it for tracking context but filter in UI.
        -- We will enforce that admin can only see rows where admin_id matches their ID AND target is 'hostel' (optional, or just all linked to them)
        auth.uid() = admin_id
    );

-- 4. Admins can update 'is_read' status
create policy "Admins can update feedback status"
    on public.feedback for update
    using (auth.uid() = admin_id)
    with check (auth.uid() = admin_id);

-- Add simple index
create index if not exists feedback_admin_id_idx on public.feedback(admin_id);
create index if not exists feedback_tenure_id_idx on public.feedback(tenure_id);
