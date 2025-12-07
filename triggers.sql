-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Check if the user is an admin
  if new.raw_user_meta_data->>'role' = 'admin' then
    insert into public.admins (id, full_name, hostel_name, hostel_address, phone, stay_key)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'hostel_name',
      new.raw_user_meta_data->>'hostel_address',
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'stay_key'
    );
  
  -- Check if the user is a tenure (tenant)
  elsif new.raw_user_meta_data->>'role' = 'tenure' then
    -- Note: Tenure creation logic might be more complex if we need to link to an admin via stay_key here.
    -- However, for now, let's assume the basic profile is created, and the admin link happens separately or we pass admin_id in metadata.
    -- If SignupTenure passes admin_id, we can use it.
    
    -- Ideally, we should look up the admin_id using the stay_key passed in metadata, but triggers can be tricky with complex logic.
    -- For simplicity, if we pass 'admin_id' in metadata from the frontend (by looking it up first), we can insert it here.
    
    insert into public.tenures (id, admin_id, full_name, email, phone, status)
    values (
      new.id,
      (new.raw_user_meta_data->>'admin_id')::uuid,
      new.raw_user_meta_data->>'full_name',
      new.email,
      new.raw_user_meta_data->>'phone',
      'pending'
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on every new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
