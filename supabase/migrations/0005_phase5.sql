create or replace function public.admin_report()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'total_users', (select count(*) from profiles),
    'active_subscribers', (select count(distinct user_id) from subscriptions where status = 'active' and current_period_end > now()),
    'prize_pool_collected_minor', (select coalesce(sum(prize_pool_amount_minor), 0) from payments),
    'prizes_awarded_minor', (select coalesce(sum(prize_minor), 0) from winners),
    'prizes_paid_minor', (select coalesce(sum(prize_minor), 0) from winners where payment_status = 'paid'),
    'charity_subscription_minor', (select coalesce(sum(charity_amount_minor), 0) from payments),
    'charity_donations_minor', (select coalesce(sum(amount_minor), 0) from donations where status = 'succeeded'),
    'draws_published', (select count(*) from draws where status = 'published'),
    'current_jackpot_rollover_minor', coalesce((select jackpot_rollover_minor from draws where status = 'published' order by month desc limit 1), 0),
    'charities', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.total_minor desc), '[]'::jsonb) from (
        select ch.id, ch.name,
          coalesce((select sum(p.charity_amount_minor) from payments p where p.charity_id = ch.id), 0) as subscription_minor,
          coalesce((select sum(d.amount_minor) from donations d where d.charity_id = ch.id and d.status = 'succeeded'), 0) as donation_minor,
          coalesce((select sum(p.charity_amount_minor) from payments p where p.charity_id = ch.id), 0)
            + coalesce((select sum(d.amount_minor) from donations d where d.charity_id = ch.id and d.status = 'succeeded'), 0) as total_minor
        from charities ch
      ) c
    ),
    'draws', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.month desc), '[]'::jsonb) from (
        select dr.month, dr.mode, dr.pool_total_minor, dr.active_subscriber_count,
          (select count(*) from draw_entries e where e.draw_id = dr.id) as entries,
          (select count(*) from winners w where w.draw_id = dr.id) as winners,
          dr.jackpot_rollover_minor
        from draws dr where dr.status = 'published'
      ) x
    )
  );
$$;

-- Server only (service role). Browsers can never call this.
revoke all on function public.admin_report() from public, anon, authenticated;
grant execute on function public.admin_report() to service_role;