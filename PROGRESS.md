# Progress
Phase 1: completed
Phase 2: completed

## What is done
- Updated SPEC.md (A9 10-50%, A12 Stripe truth); wrote supabase/migrations/0002_phase2.sql.
- Installed Stripe SDK & Vitest; implemented pure billing logic in billing.ts (11 unit tests passing).
- Created scripts/stripe-setup.ts (`npm run stripe:setup`, idempotent products and INR recurring prices).
- Built subscription state helpers, route guards, and Stripe synchronizer in src/lib/subscription.ts.
- Built /subscribe with resilient customer creation, checkout sessions, and portal redirects.
- Built idempotent Stripe webhook at /api/stripe/webhook with signature verification and invoice recording.
- Enhanced /dashboard with subscription status card, direct checkout sync, and billing portal actions.
- Created /dashboard/scores with requireActiveSubscription() guard.
- Updated .env.example, package.json, and README.md with webhook and Stripe setup docs.
- Verified: `npm test`, `npm run typecheck`, and `npm run build` all pass with zero errors.

## Key files
- src/lib/billing.ts & src/lib/billing.test.ts
- src/lib/subscription.ts & src/lib/stripe.ts
- src/app/api/stripe/webhook/route.ts & src/middleware.ts
- src/app/subscribe/ (page.tsx, actions.ts)
- src/app/dashboard/ (page.tsx, scores/page.tsx)
- supabase/migrations/0002_phase2.sql & scripts/stripe-setup.ts

## Known bugs / Notes
- None. Run `0002_phase2.sql` in Supabase SQL editor when convenient for schema sync.
