# Progress
Phase 1: completed | Phase 2: completed | Phase 3: completed | Phase 4: completed

## What is done
- SPEC.md updated (A17-A19: draw simulation, pool base/carry-in, winner verification).
- 0004_phase4.sql: publish_draw stored procedure (atomic entries & winners insert) and RLS.
- Draw engine (src/lib/draw.ts, draw.test.ts): pure business logic for random/algorithmic modes, pool math, tier splits, and rollover.
- Admin draw system: src/lib/draw-server.ts, /admin/draws (simulation preview, tier table, publish confirm).
- Winners & verification: /admin/winners (proof review via 60s signed URLs, approve/reject, payout guard), /dashboard/winnings (user prize tracking & 5MB image upload to winner-proofs).
- Verified: `npm test` (27 tests), `npm run typecheck`, and `npm run build` all pass with zero errors.

## Key files
- src/lib/draw.ts, src/lib/draw.test.ts, src/lib/draw-server.ts, src/lib/admin.ts
- src/app/admin/draws/ (page.tsx, actions.ts, publish-button.tsx)
- src/app/admin/winners/ (page.tsx, actions.ts)
- src/app/dashboard/winnings/ (page.tsx, actions.ts)
- supabase/migrations/0004_phase4.sql

## Known bugs / Notes
- None. Execute `supabase/migrations/0004_phase4.sql` in Supabase SQL editor and create private storage bucket `winner-proofs`.
