-- 0003_phase3.sql: Phase 3 schema changes for scores and charities

-- 1. Add category to charities
alter table public.charities add column if not exists category text;

-- 2. Security definer function to check active subscription
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid
      and status = 'active'
      and current_period_end > now()
  );
$$;

-- 3. Replace scores RLS policies so writes require active subscription
drop policy if exists "Users manage own scores" on public.scores;
drop policy if exists "Users select own scores" on public.scores;
drop policy if exists "Users insert own scores" on public.scores;
drop policy if exists "Users update own scores" on public.scores;
drop policy if exists "Users delete own scores" on public.scores;

create policy "Users select own scores"
  on public.scores for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "Users insert own scores"
  on public.scores for insert
  to authenticated
  with check ((auth.uid() = user_id and public.has_active_subscription(auth.uid())) or public.is_admin());

create policy "Users update own scores"
  on public.scores for update
  to authenticated
  using ((auth.uid() = user_id and public.has_active_subscription(auth.uid())) or public.is_admin())
  with check ((auth.uid() = user_id and public.has_active_subscription(auth.uid())) or public.is_admin());

create policy "Users delete own scores"
  on public.scores for delete
  to authenticated
  using ((auth.uid() = user_id and public.has_active_subscription(auth.uid())) or public.is_admin());

-- 4. Verify/Recreate rolling-5 scores trigger strictly enforcing A8
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
