-- scores_rule.sql: Automated test script for rolling-5 scores logic (SPEC A8)
-- Run in Supabase SQL editor. All changes rollback automatically.

begin;

do $$
declare
  uid uuid;
  cnt int;
  has_oldest boolean;
  err_caught boolean;
begin
  -- Resolve test user ID
  select id into uid from auth.users where email = 'test@digitalheroes.test';
  if uid is null then
    -- Fallback to profile if auth.users not visible in current context
    select id into uid from public.profiles limit 1;
  end if;

  if uid is null then
    raise exception 'No test user found for running scores_rule test';
  end if;

  -- Clean temporary scores for test user
  delete from public.scores where user_id = uid;

  -- ==========================================================
  -- TEST 1: Fewer than 5 just adds
  -- ==========================================================
  insert into public.scores (user_id, score, played_on) values
    (uid, 30, '2026-01-01'),
    (uid, 31, '2026-01-02'),
    (uid, 32, '2026-01-03'),
    (uid, 33, '2026-01-04');

  select count(*) into cnt from public.scores where user_id = uid;
  if cnt = 4 then
    raise notice 'PASS: Fewer than 5 just adds (count = 4)';
  else
    raise notice 'FAIL: Fewer than 5 just adds (expected 4, got %)', cnt;
  end if;

  -- Add 5th score
  insert into public.scores (user_id, score, played_on) values (uid, 34, '2026-01-05');
  select count(*) into cnt from public.scores where user_id = uid;
  if cnt = 5 then
    raise notice 'PASS: 5th score added (count = 5)';
  else
    raise notice 'FAIL: 5th score addition (expected 5, got %)', cnt;
  end if;

  -- ==========================================================
  -- TEST 2: Duplicate date fails (unique constraint)
  -- ==========================================================
  err_caught := false;
  begin
    insert into public.scores (user_id, score, played_on) values (uid, 35, '2026-01-05');
  exception
    when unique_violation then
      err_caught := true;
  end;

  if err_caught then
    raise notice 'PASS: Duplicate date fails';
  else
    raise notice 'FAIL: Duplicate date was allowed';
  end if;

  -- ==========================================================
  -- TEST 3: Date older than all 5 fails
  -- ==========================================================
  err_caught := false;
  begin
    insert into public.scores (user_id, score, played_on) values (uid, 36, '2025-12-31');
  exception
    when others then
      if sqlerrm like '%older than or equal to%' then
        err_caught := true;
      end if;
  end;

  if err_caught then
    raise notice 'PASS: Date older than all 5 fails';
  else
    raise notice 'FAIL: Date older than all 5 was not rejected';
  end if;

  -- ==========================================================
  -- TEST 4: 6th insert evicts oldest
  -- ==========================================================
  -- Insert score with newer date '2026-01-06'
  insert into public.scores (user_id, score, played_on) values (uid, 40, '2026-01-06');

  select count(*) into cnt from public.scores where user_id = uid;
  select exists (select 1 from public.scores where user_id = uid and played_on = '2026-01-01') into has_oldest;

  if cnt = 5 and not has_oldest then
    raise notice 'PASS: 6th insert evicts oldest (count = 5, 2026-01-01 removed)';
  else
    raise notice 'FAIL: 6th insert eviction (count = %, has_oldest = %)', cnt, has_oldest;
  end if;

end $$;

rollback;
