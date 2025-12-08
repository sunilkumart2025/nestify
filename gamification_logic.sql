-- Helper Function to safely award a badge
create or replace function award_badge(target_user_id uuid, badge_code text)
returns void as $$
begin
    insert into user_badges (user_id, badge_id)
    values (target_user_id, badge_code)
    on conflict (user_id, badge_id) do nothing;
end;
$$ language plpgsql security definer;

-- Trigger Function: Payment Achievements
create or replace function check_payment_achievements()
returns trigger as $$
declare
    consecutive_payments int;
    invoice_due_date date;
begin
    -- Only run on successful payments (Schema uses payment_status = 'SUCCESS')
    if new.payment_status = 'SUCCESS' then
        
        -- 1. Check Early Bird: Payment Time < Due Date
        -- We need to fetch due_date from the linked invoice
        if new.invoice_id is not null then
            select due_date into invoice_due_date
            from invoices
            where id = new.invoice_id;

            -- Check if paid on or before due date
            if invoice_due_date is not null and new.payment_time::date <= invoice_due_date then
                perform award_badge(new.tenure_id, 'early_bird');
            end if;
        end if;

        -- 2. Check Streak Master: 3 consecutive on-time payments
        -- We need to join with invoices to check the dates for previous payments
        select count(*)
        into consecutive_payments
        from (
            select p.payment_status, p.payment_time, i.due_date
            from payments p
            join invoices i on p.invoice_id = i.id
            where p.tenure_id = new.tenure_id
            and p.payment_status = 'SUCCESS'
            order by p.payment_time desc
            limit 3
        ) recent
        where recent.payment_time::date <= recent.due_date;

        if consecutive_payments >= 3 then
            perform award_badge(new.tenure_id, 'streak_master');
        end if;

    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger: Associate with Payments Table
drop trigger if exists trigger_check_payment_achievements on payments;
create trigger trigger_check_payment_achievements
    after insert or update on payments
    for each row
    execute function check_payment_achievements();


-- Trigger Function: Profile Achievements
create or replace function check_profile_achievements()
returns trigger as $$
begin
    -- Verified Guardian: 2FA Enabled + Phone present
    if new.is_2fa_enabled = true and new.phone is not null and length(new.phone) >= 10 then
        perform award_badge(new.id, 'verified_guardian');
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger: Associate with Tenures Table
drop trigger if exists trigger_check_profile_achievements on tenures;
create trigger trigger_check_profile_achievements
    after insert or update on tenures
    for each row
    execute function check_profile_achievements();
