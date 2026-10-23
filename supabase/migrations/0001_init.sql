-- 0001_init.sql: Digital Heroes initial schema, tables, triggers, RLS, and storage
-- Extensions
create extension if not exists "pgcrypto";

-- 1. Charities
create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  gallery text[] default '{}',
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Charity Events
create table if not exists public.charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references public.charities(id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz,
  location text,
  created_at timestamptz default now()
);

-- 3. Profiles (references auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'subscriber' check (role in ('subscriber', 'admin')),
  charity_id uuid references public.charities(id) on delete set null,
  charity_percent int not null default 10 check (charity_percent between 10 and 100),
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- 4. Plans (stored in plans, never hard-coded)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('monthly', 'yearly')),
  name text not null,
  interval text not null check (interval in ('month', 'year')),
  price_minor int not null check (price_minor > 0),
  currency text not null default 'INR',
  stripe_price_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  stripe_subscription_id text unique,
  status text not null check (status in ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_invoice_id text unique,
  amount_minor int not null check (amount_minor > 0),
  charity_id uuid references public.charities(id) on delete set null,
  charity_percent int check (charity_percent between 10 and 100),
  charity_amount_minor int not null check (charity_amount_minor >= 0),
  prize_pool_amount_minor int not null check (prize_pool_amount_minor >= 0),
  paid_at timestamptz not null default now()
);

-- 7. Scores
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 1 and 45),
  played_on date not null,
  created_at timestamptz default now(),
  unique (user_id, played_on)
);

-- 8. Donations
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  charity_id uuid not null references public.charities(id) on delete cascade,
  amount_minor int not null check (amount_minor > 0),
  stripe_payment_intent_id text unique,
  status text not null,
  created_at timestamptz default now()
);

-- 9. Platform Settings
create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  prize_pool_percent int not null default 50,
  tier5_percent int not null default 40,
  tier4_percent int not null default 35,
  tier3_percent int not null default 25,
  min_charity_percent int not null default 10,
  updated_at timestamptz default now()
);

-- 10. Draws
create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  month date unique not null,
  mode text not null check (mode in ('random', 'algorithmic')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  drawn_numbers int[],
  active_subscriber_count int default 0,
  pool_total_minor int default 0,
  jackpot_carry_in_minor int default 0,
  tier5_pool_minor int default 0,
  tier4_pool_minor int default 0,
  tier3_pool_minor int default 0,
  jackpot_rollover_minor int default 0,
  simulation jsonb,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- 11. Draw Entries
create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scores_snapshot int[] not null,
  match_count int not null,
  unique (draw_id, user_id)
);

-- 12. Winners
create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier int not null check (tier in (3, 4, 5)),
  prize_minor int not null check (prize_minor >= 0),
  proof_path text,
  verification_status text not null default 'awaiting_proof' check (verification_status in ('awaiting_proof', 'submitted', 'approved', 'rejected')),
  admin_note text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  unique (draw_id, user_id)
);

-- Indexes for performance
create index if not exists idx_scores_user_played_on on public.scores(user_id, played_on desc);
create index if not exists idx_subscriptions_user_status on public.subscriptions(user_id, status);
create index if not exists idx_charity_events_charity on public.charity_events(charity_id);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_draw_entries_draw on public.draw_entries(draw_id);
create index if not exists idx_winners_draw on public.winners(draw_id);

-- Helper function: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Trigger 1: on auth.users insert, create the profiles row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'subscriber')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger 2: protect profile fields (role and stripe_customer_id)
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
    if new.stripe_customer_id is distinct from old.stripe_customer_id then
      raise exception 'Users cannot alter stripe_customer_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Trigger 3: rolling-5 scores trigger (A8)
create or replace function public.enforce_rolling_scores()
returns trigger
language plpgsql
as $$
declare
  existing_count int;
  oldest_date date;
  oldest_id uuid;
begin
  select count(*) into existing_count
  from public.scores
  where user_id = new.user_id;

  if existing_count >= 5 then
    select id, played_on into oldest_id, oldest_date
    from public.scores
    where user_id = new.user_id
    order by played_on asc, created_at asc
    limit 1;

    if new.played_on <= oldest_date then
      raise exception 'Score date % is older than or equal to the oldest of the 5 existing scores (%)', new.played_on, oldest_date;
    else
      delete from public.scores where id = oldest_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_rolling_scores on public.scores;
create trigger trg_enforce_rolling_scores
  before insert on public.scores
  for each row execute function public.enforce_rolling_scores();

-- ===================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "Admin can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id or public.is_admin());

-- Charities
alter table public.charities enable row level security;

create policy "Public read active charities"
  on public.charities for select
  to public
  using (is_active = true or public.is_admin());

create policy "Admin write charities"
  on public.charities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Charity Events
alter table public.charity_events enable row level security;

create policy "Public read active charity events"
  on public.charity_events for select
  to public
  using (
    exists (
      select 1 from public.charities c
      where c.id = charity_events.charity_id and (c.is_active = true or public.is_admin())
    )
  );

create policy "Admin write charity events"
  on public.charity_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Plans
alter table public.plans enable row level security;

create policy "Public read active plans"
  on public.plans for select
  to public
  using (is_active = true or public.is_admin());

create policy "Admin write plans"
  on public.plans for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Subscriptions (User reads own, Admin reads all, NO client writes)
alter table public.subscriptions enable row level security;

create policy "Users read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Payments (User reads own, Admin reads all, NO client writes)
alter table public.payments enable row level security;

create policy "Users read own payments"
  on public.payments for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Scores (User full access to own rows, Admin all)
alter table public.scores enable row level security;

create policy "Users manage own scores"
  on public.scores for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- Donations (User reads own, Admin reads all, NO client writes)
alter table public.donations enable row level security;

create policy "Users read own donations"
  on public.donations for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Platform Settings (Everyone reads, Admin writes)
alter table public.platform_settings enable row level security;

create policy "Everyone can read platform settings"
  on public.platform_settings for select
  to public
  using (true);

create policy "Admin write platform settings"
  on public.platform_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Draws (Everyone reads published, Admin all)
alter table public.draws enable row level security;

create policy "Everyone read published draws"
  on public.draws for select
  to public
  using (status = 'published' or public.is_admin());

create policy "Admin manage draws"
  on public.draws for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Draw Entries (User reads own, Admin reads all, NO client writes)
alter table public.draw_entries enable row level security;

create policy "Users read own draw entries"
  on public.draw_entries for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Winners (User reads own, Admin reads all, NO client writes)
alter table public.winners enable row level security;

create policy "Users read own winners records"
  on public.winners for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Storage bucket: winner-proofs
insert into storage.buckets (id, name, public)
values ('winner-proofs', 'winner-proofs', false)
on conflict (id) do nothing;

create policy "Users upload own winner proofs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'winner-proofs' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users and admins read own winner proofs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'winner-proofs' and
    ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "Admins manage all winner proofs"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'winner-proofs' and public.is_admin()
  )
  with check (
    bucket_id = 'winner-proofs' and public.is_admin()
  );

-- ===================================================
-- SEED DATA (SPEC.md A1, A2, A6)
-- ===================================================
insert into public.plans (key, name, interval, price_minor, currency, stripe_price_id, is_active)
values
  ('monthly', 'Monthly Hero', 'month', 49900, 'INR', null, true),
  ('yearly', 'Yearly Hero', 'year', 499000, 'INR', null, true)
on conflict (key) do update set
  price_minor = excluded.price_minor,
  name = excluded.name,
  interval = excluded.interval;

insert into public.platform_settings (id, prize_pool_percent, tier5_percent, tier4_percent, tier3_percent, min_charity_percent)
values (1, 50, 40, 35, 25, 10)
on conflict (id) do update set
  prize_pool_percent = excluded.prize_pool_percent,
  tier5_percent = excluded.tier5_percent,
  tier4_percent = excluded.tier4_percent,
  tier3_percent = excluded.tier3_percent,
  min_charity_percent = excluded.min_charity_percent;
