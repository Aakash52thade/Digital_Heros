-- 0002_phase2.sql: Updates for Phase 2 Stripe subscriptions and charity percentages

-- 1. Replace charity_percent constraint to be between 10 and 50
alter table public.profiles drop constraint if exists profiles_charity_percent_check;
alter table public.profiles add constraint profiles_charity_percent_check check (charity_percent between 10 and 50);

-- 2. Ensure payments.charity_id is nullable (charity selection configured in Phase 3)
alter table public.payments alter column charity_id drop not null;

-- 3. Enhance is_admin() to recognize service_role caller
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Service role and database superusers are always admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return true;
  end if;

  begin
    if (coalesce(current_setting('request.jwt.claim.role', true), auth.jwt() ->> 'role')) = 'service_role' then
      return true;
    end if;
  exception
    when others then
      null;
  end;

  -- Authenticated user checking profiles table
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- 4. Recreate protect_profile_fields allowing initial customer linking and service_role updates
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only administrators can change role';
    end if;
    if old.stripe_customer_id is not null and new.stripe_customer_id is distinct from old.stripe_customer_id then
      raise exception 'Users cannot alter stripe_customer_id';
    end if;
  end if;
  return new;
end;
$$;
