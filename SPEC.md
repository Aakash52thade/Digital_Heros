# Digital Heroes spec (source of truth)
Users subscribe (monthly or yearly), enter their latest golf scores (Stableford), take part in a monthly prize draw, and give part of their fee to a charity they choose.
Roles: visitor (not logged in), subscriber, admin.

## Locked assumptions
A1 Currency INR. Monthly 49900 paise, yearly 499000 paise. Stored in `plans`, never hard-coded.
A2 Prize pool = 50% of each active subscriber's monthly-equivalent fee (yearly / 12). Charity = user's % (min 10%) of the fee. Rest is platform.
A3 Draw = 5 distinct numbers from 1 to 45. A user's match count = how many drawn numbers appear in their current 5 scores (distinct values, each drawn number counted once).
A4 Random mode: uniform. Algorithmic mode: weight of number n = (count of eligible users who have n in their scores) + 1, draw 5 without replacement by weight.
A5 Eligible for a draw: active subscription at draw time AND exactly 5 scores. Their scores are snapshotted in draw_entries.
A6 Tiers: 5-match 40%, 4-match 35%, 3-match 25% of the pool. Equal split inside a tier, rounded down to the paisa, remainder stays with platform. No 5-match winner: that tier's amount rolls into next month's 5-match pool (jackpot). Unclaimed 4 and 3 tiers do NOT roll over.
A7 One draw per month. Status: draft then published. Simulation = same calculation without publishing, invisible to users.
A8 Scores: integer 1-45 with a date. One per date per user (only edit/delete for that date). Keep the latest 5 by played_on. A new score replaces the oldest. If a new score is older than all 5 existing ones, reject it. Show newest first.
A9 Charity: chosen at signup, min 10%, user can raise up to 50% (pool takes 50%, so charity + pool must never exceed 100%). Independent donation = separate one-off payment, not part of the prize pool.
A10 Winner flow: awaiting_proof, then submitted (screenshot of scores), then admin approves or rejects. Payment: pending then paid.
A11 Subscription is active when status = active AND current_period_end is in the future. A canceled subscription stays active until period end.
A12 Stripe is the source of truth; our DB mirrors it via webhooks.

## Tables (all in supabase/migrations/0001_init.sql)
- profiles: id (= auth.users.id), full_name, role ('subscriber'|'admin', default 'subscriber'), charity_id, charity_percent int default 10 check 10..100, stripe_customer_id, created_at
- plans: id, key ('monthly'|'yearly'), name, interval, price_minor, currency, stripe_price_id, is_active
- subscriptions: id, user_id, plan_id, stripe_subscription_id unique, status ('active'|'past_due'|'canceled'|'incomplete'), current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
- payments: id, user_id, subscription_id, stripe_invoice_id unique, amount_minor, charity_id, charity_percent, charity_amount_minor, prize_pool_amount_minor, paid_at (snapshot at payment time, used for reports)
- scores: id, user_id, score int check 1..45, played_on date, created_at, unique(user_id, played_on)
- charities: id, name, slug unique, description, image_url, gallery text[], is_featured, is_active, created_at
- charity_events: id, charity_id, title, description, event_date, location
- donations: id, user_id (nullable), charity_id, amount_minor, stripe_payment_intent_id unique, status, created_at
- platform_settings (single row): prize_pool_percent 50, tier5_percent 40, tier4_percent 35, tier3_percent 25, min_charity_percent 10
- draws: id, month date unique (first day of month), mode ('random'|'algorithmic'), status ('draft'|'published'), drawn_numbers int[], active_subscriber_count, pool_total_minor, jackpot_carry_in_minor, tier5_pool_minor, tier4_pool_minor, tier3_pool_minor, jackpot_rollover_minor, simulation jsonb, published_at, created_at
- draw_entries: id, draw_id, user_id, scores_snapshot int[], match_count, unique(draw_id, user_id)
- winners: id, draw_id, user_id, tier (3|4|5), prize_minor, proof_path, verification_status ('awaiting_proof'|'submitted'|'approved'|'rejected'), admin_note, payment_status ('pending'|'paid'), reviewed_at, paid_at, created_at, unique(draw_id, user_id)

## Security (RLS on every table)
- is_admin() security-definer function reads profiles.role.
- profiles: user reads and updates own row but cannot change role or stripe_customer_id (enforce with a trigger). Admin full access.
- scores: user full access to own rows. Admin all. DB trigger enforces A8 (keep latest 5, reject too-old date).
- charities, charity_events, plans: public read (active only); admin write.
- subscriptions, payments, donations, draw_entries, winners: user reads own; admin reads all; NO client writes (server with service role only).
- draws: everyone reads published; admin all. platform_settings: everyone reads; admin writes.
- Storage bucket `winner-proofs`: private; user can upload and read only under folder {user_id}/; admin reads all.
- Trigger: on auth.users insert, create the profiles row.

## Later phases (do not build now)
2 Stripe subscriptions + webhook. 3 Scores UI + charity. 4 Draw engine + winners. 5 Dashboards. 6 Public site + UI polish. 7 Testing + delivery.
