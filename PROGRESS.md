# Progress
Phase 1: completed | Phase 2: completed | Phase 3: completed | Phase 4: completed | Phase 5: completed

## What is done
- SPEC additions (A20-A22: upcoming draw logic, admin user & Stripe management, admin_report).
- /dashboard: rebuilt with 5 responsive modules (subscription, scores, charity, participation A20, winnings).
- /dashboard/settings: full name editor with zod validation and account sign-out.
- /admin layout & overview: shared navigation bar and admin_report() dashboard (9 stat cards, charity breakdown, draw history).
- /admin/users & /admin/users/[id]: subscriber search, profile & charity edit (role protected A21), rolling-5 scores CRUD, Stripe cancel/resume.
- /admin/charities: partner listing, new charity creation, edit form with gallery upload to `charity-media`, events management, and safe deletion (23503 handling).
- Verified: `npm test` (43 tests), `npx tsc`, and `npm run build` all pass with zero errors.

## Key files
- src/app/dashboard/ (page.tsx, settings/page.tsx, settings/actions.ts)
- src/app/admin/ (layout.tsx, page.tsx)
- src/app/admin/users/ (page.tsx, [id]/page.tsx, [id]/actions.ts, [id]/client.tsx)
- src/app/admin/charities/ (page.tsx, new/page.tsx, [id]/page.tsx, actions.ts, delete-button.tsx)

## Known bugs / Notes
- None. Execute `0005_phase5.sql` in Supabase SQL editor if not already run.
