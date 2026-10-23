-- 0004_phase4.sql: publish_draw stored procedure and security policies

create or replace function public.publish_draw(p_draw_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry jsonb;
  v_winner jsonb;
begin
  -- Guard: must be draft
  if not exists (select 1 from public.draws where id = p_draw_id and status = 'draft') then
    raise exception 'Draw % is not in draft status', p_draw_id;
  end if;

  -- Update draw row with published data
  update public.draws set
    status = 'published',
    drawn_numbers = (select array_agg(v::int) from jsonb_array_elements_text(p_payload->'drawn_numbers') v),
    active_subscriber_count = (p_payload->>'active_subscriber_count')::int,
    pool_total_minor = (p_payload->>'pool_total_minor')::int,
    jackpot_carry_in_minor = (p_payload->>'jackpot_carry_in_minor')::int,
    tier5_pool_minor = (p_payload->>'tier5_pool_minor')::int,
    tier4_pool_minor = (p_payload->>'tier4_pool_minor')::int,
    tier3_pool_minor = (p_payload->>'tier3_pool_minor')::int,
    jackpot_rollover_minor = (p_payload->>'jackpot_rollover_minor')::int,
    published_at = now()
  where id = p_draw_id;

  -- Clear previous entries/winners if any existed
  delete from public.draw_entries where draw_id = p_draw_id;
  delete from public.winners where draw_id = p_draw_id;

  -- Insert entries
  for v_entry in select * from jsonb_array_elements(p_payload->'entries') loop
    insert into public.draw_entries (draw_id, user_id, scores_snapshot, match_count)
    values (
      p_draw_id,
      (v_entry->>'user_id')::uuid,
      (select array_agg(v::int) from jsonb_array_elements_text(v_entry->'scores_snapshot') v),
      (v_entry->>'match_count')::int
    );
  end loop;

  -- Insert winners
  for v_winner in select * from jsonb_array_elements(p_payload->'winners') loop
    insert into public.winners (draw_id, user_id, tier, prize_minor)
    values (
      p_draw_id,
      (v_winner->>'user_id')::uuid,
      (v_winner->>'tier')::int,
      (v_winner->>'prize_minor')::int
    );
  end loop;
end;
$$;

-- RLS for draws: published visible to all; admin sees all
alter table public.draws enable row level security;
drop policy if exists "draws_read_published" on public.draws;
create policy "draws_read_published" on public.draws
  for select using (status = 'published' or public.is_admin());
drop policy if exists "draws_admin_all" on public.draws;
create policy "draws_admin_all" on public.draws
  for all using (public.is_admin());

-- draw_entries: user reads own, admin all
alter table public.draw_entries enable row level security;
drop policy if exists "entries_read_own" on public.draw_entries;
create policy "entries_read_own" on public.draw_entries
  for select using (user_id = auth.uid() or public.is_admin());

-- winners: user reads own, admin all
alter table public.winners enable row level security;
drop policy if exists "winners_read_own" on public.winners;
create policy "winners_read_own" on public.winners
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "winners_admin_all" on public.winners;
create policy "winners_admin_all" on public.winners
  for all using (public.is_admin());
