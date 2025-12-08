-- Operation Black Ledger: Expense Management Schema

-- 1. Vendors Table
-- Stores suppliers and service providers
create table if not exists public.vendors (
    id uuid default uuid_generate_v4() primary key,
    admin_id uuid references public.admins(id) on delete cascade not null,
    name text not null,
    category text, -- e.g. "Maintenance", "Utilities"
    phone text,
    email text,
    gst_number text,
    address text,
    balance decimal default 0, -- Amount we owe them (Credit) or they owe us (Debit)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Vendors
alter table public.vendors enable row level security;

create policy "Admins can manage their own vendors"
    on public.vendors for all
    using (admin_id = auth.uid());

-- 2. Expenses Table
-- The core ledger
create table if not exists public.expenses (
    id uuid default uuid_generate_v4() primary key,
    admin_id uuid references public.admins(id) on delete cascade not null,
    vendor_id uuid references public.vendors(id) on delete set null,
    
    title text not null, -- Short description
    amount decimal not null,
    category text not null, -- "Maintenance", "Salary", "Electricity", "Rent", "Office"
    
    expense_date date default current_date,
    payment_mode text default 'cash', -- "cash", "upi", "bank_transfer"
    
    receipt_url text, -- Storage path for image/pdf
    notes text,
    
    is_recurring boolean default false,
    recurring_interval text, -- "monthly", "weekly"
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Expenses
alter table public.expenses enable row level security;

create policy "Admins can manage their own expenses"
    on public.expenses for all
    using (admin_id = auth.uid());

-- 3. Indexes for Analytics speed
create index if not exists idx_expenses_admin_date on public.expenses(admin_id, expense_date);
create index if not exists idx_expenses_category on public.expenses(admin_id, category);

-- 4. RPC for P&L Reporting (Monthly)
-- Returns Income vs Expense for the last 6 months
create or replace function get_monthly_pnl(p_admin_id uuid)
returns table (
    month text,
    income decimal,
    expense decimal,
    profit decimal
) 
language plpgsql
security definer
as $$
begin
    return query
    with months as (
        select generate_series(
            date_trunc('month', current_date - interval '5 months'),
            date_trunc('month', current_date),
            '1 month'::interval
        ) as month_start
    ),
    income_data as (
        select 
            date_trunc('month', payment_time) as month, 
            sum(order_amount) as total 
        from payments 
        where admin_id = p_admin_id and payment_status = 'SUCCESS'
        group by 1
    ),
    expense_data as (
        select 
            date_trunc('month', expense_date) as month, 
            sum(amount) as total 
        from expenses 
        where admin_id = p_admin_id
        group by 1
    )
    select 
        to_char(m.month_start, 'Mon YYYY') as month,
        coalesce(i.total, 0) as income,
        coalesce(e.total, 0) as expense,
        (coalesce(i.total, 0) - coalesce(e.total, 0)) as profit
    from months m
    left join income_data i on i.month = m.month_start
    left join expense_data e on e.month = m.month_start
    order by m.month_start desc;
end;
$$;
