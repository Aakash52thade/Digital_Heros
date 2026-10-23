# Digital Heroes

## 1. Overview
Digital Heroes is an emotion-driven, charity-first subscription platform. Members subscribe to support vetted charitable causes, enter their latest golf scores (Stableford), and participate in monthly prize draws.

The platform recognizes three distinct roles:
- **Visitor**: Browses partner charities, views the "How It Works" guide, makes independent one-off donations, and signs up.
- **Subscriber**: Authenticated user with an active subscription. Enters and manages up to 5 rolling golf scores, selects a supported charity and contribution percentage (10–50%), participates in monthly draws, and uploads scorecard verification proofs to claim prize winnings.
- **Admin**: Platform operator. Runs monthly draw simulations, publishes official draws, verifies winner proofs, records payouts, manages charities and events, inspects users, and tracks financial and charitable performance via aggregated metrics.

---

## 2. Live Demo
- **Live URL**: <LIVE_URL>
- **Admin**: <ADMIN_EMAIL> / <ADMIN_PASSWORD>
- **Test user**: <TEST_EMAIL> / <TEST_PASSWORD>
- **Stripe test card**: `4242 4242 4242 4242`, any future expiry, any CVC

---

## 3. Features by Area

### Subscription and Payments
- Monthly (₹499/mo) and yearly (₹4,990/yr) recurring membership plans stored in database minor units (paise).
- Integrated Stripe Checkout with automated customer creation and billing portal management.
- Webhook-driven status synchronization (`active`, `past_due`, `canceled`, `incomplete`).

### Score Management
- Golfers enter Stableford scores (1–45) with dates (cannot be in the future, validated to Asia/Kolkata).
- Automated rolling-5 trigger: retains the latest 5 scores by `played_on`, replaces the oldest on new additions, and rejects scores older than all 5 existing entries.
- One score per date per user with full edit and delete capability for active subscribers.

### Draw and Prize System
- 5 distinct numbers drawn monthly between 1 and 45.
- Two operational modes: Uniform Random or Algorithmic (drawn numbers weighted by participant score frequency).
- 50% of active subscriber fees form the monthly prize pool.
- Three winning tiers: Tier 5 (40%), Tier 4 (35%), and Tier 3 (25%), split equally per tier.
- Unclaimed Tier 5 prize money rolls over into next month's Tier 5 jackpot; unclaimed Tier 4 and 3 remain with the platform.
- Zero-side-effect simulations for admin inspection before atomic publication.

### Charity System
- Vetted charity catalog with category filters, image gallery, search, and upcoming events.
- Members allocate 10% to 50% of their subscription fee directly to their selected charity.
- Independent one-off guest donations via Stripe Checkout (₹100 to ₹1,00,000), kept strictly separate from the prize pool.

### Winner Verification
- Secure multi-step verification: `awaiting_proof` → `submitted` → `approved` / `rejected`.
- Winners upload scorecard screenshots to a private Supabase Storage bucket (`winner-proofs`).
- Lapsed or canceled subscribers retain access to view winnings and submit proof.
- Admin dashboard to inspect scorecards, record review notes, and transition payment to `paid`.

### User Dashboard
- 5-module responsive interface: Membership & Renewal, Golf Scores Overview, Supported Charity & Allocation, Monthly Draw Eligibility (A20), and Prize Winnings Summary.
- Account profile settings for updating display name and secure sign-out.

### Admin Dashboard
- Consolidated platform overview powered by `admin_report()` aggregating subscribers, revenue, charity payouts, and draw history.
- Subscriber search and directory with direct subscription management (cancel/resume).
- Complete Partner Charity CRUD with image and gallery uploads to `charity-media`.
- Draw control center: simulation engine, numbers preview, and one-click atomic publication.
- Winner claim queue with inline proof scorecard inspector and verification actions.

### UI/UX
- Charity-first, emotional aesthetic avoiding golf clichés and stock photography.
- Fully responsive across desktop down to 375px mobile screens with horizontal scrolling tables and navigation.
- Framer Motion page reveals, staggered card grids, animated `CountUp` metric counters, skeleton loaders, and accessible focus rings.

---

## 4. Tech Stack and Project Structure

### Tech Stack
- **Framework**: Next.js 14 (App Router, Server Actions)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS, shadcn/ui design tokens
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage, `@supabase/ssr`)
- **Payments**: Stripe API, Stripe Checkout, Stripe Customer Portal, Stripe Webhooks
- **Motion**: Framer Motion
- **Validation**: Zod (server-side input validation)
- **Testing**: Vitest

### Project Structure
```
c:\Users\akash\OneDrive\Desktop\Projects\Golf\
├── public/                 # Static assets
├── scripts/                # Database seed and Stripe setup scripts
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, routes, actions)
│   │   ├── (public)/       # Marketing pages: Home, Charities, How It Works
│   │   ├── admin/          # Admin portal (Overview, Charities, Draws, Users, Winners)
│   │   ├── api/            # API routes (Stripe webhook endpoint)
│   │   ├── auth/           # Authentication actions (logout)
│   │   ├── dashboard/      # Subscriber portal (Scores, Settings, Winnings)
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   └── subscribe/      # Membership plans and checkout
│   ├── components/         # Reusable UI components, skeletons, motion wrappers
│   └── lib/                # Pure business logic, DB queries, Stripe helpers, schemas
│       └── supabase/       # Client, Server, and Admin Supabase instances
└── supabase/
    ├── migrations/         # SQL migration scripts (0001 through 0005)
    └── tests/              # Database rule verification tests
```

---

## 5. Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable Name | Purpose | Where to Get It | Server-Only? |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Supabase Dashboard > Settings > API | No (Public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Public Key | Supabase Dashboard > Settings > API | No (Public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin Service Key | Supabase Dashboard > Settings > API | **Yes (Server-Only)** |
| `NEXT_PUBLIC_SITE_URL` | Application base URL | `http://localhost:3000` for local dev | No (Public) |
| `STRIPE_SECRET_KEY` | Stripe Secret API Key | Stripe Dashboard > Developers > API keys | **Yes (Server-Only)** |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret | Stripe CLI output or Stripe Dashboard Webhooks | **Yes (Server-Only)** |
| `ADMIN_EMAIL` | Initial admin account email | Local seed preference (e.g. `admin@digitalheroes.test`) | **Yes (Server-Only)** |
| `ADMIN_PASSWORD` | Initial admin account password | Local seed preference | **Yes (Server-Only)** |
| `TEST_USER_EMAIL` | Initial test subscriber email | Local seed preference (e.g. `test@digitalheroes.test`) | **Yes (Server-Only)** |
| `TEST_USER_PASSWORD` | Initial test subscriber password| Local seed preference | **Yes (Server-Only)** |

### 3. Run Migrations
Run the migration scripts in numerical order using the **Supabase SQL Editor**:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_phase2.sql`
3. `supabase/migrations/0003_phase3.sql`
4. `supabase/migrations/0004_phase4.sql`
5. `supabase/migrations/0005_phase5.sql`

### 4. Create Storage Buckets
In the Supabase Dashboard under **Storage**, create two buckets:
1. `winner-proofs`: **Private** bucket (used for scorecard uploads; RLS restricted to `{user_id}/` folder and admin).
2. `charity-media`: **Public** bucket (used for charity logos, banner images, and event galleries).

### 5. Seed Data & Configure Stripe Products
```bash
# Seed initial database settings, sample charities, and admin/test accounts
npm run seed

# Create Stripe recurring products/prices and link stripe_price_id in DB
npm run stripe:setup
```

### 6. Start Stripe Webhook Listener
In a separate terminal window, listen to the 6 required events:
```bash
stripe listen --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed --forward-to localhost:3000/api/stripe/webhook
```
Copy the printed `whsec_...` secret and assign it to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 7. Run the Application
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 6. Deployment

1. **Vercel & Supabase**: Create a new project in Supabase and a new project in Vercel linked to your Git repository.
2. **Environment Variables on Vercel**: Add all variables from `.env.local` to Vercel Project Settings. Ensure `NEXT_PUBLIC_SITE_URL` matches your production Vercel domain (e.g., `https://digital-heroes.vercel.app`), then trigger a deployment.
3. **Stripe Webhook Endpoint**:
   - Create an endpoint in Stripe Dashboard (Developers > Webhooks) pointing to:
     `https://<YOUR-DOMAIN>/api/stripe/webhook`
   - Select the 6 required events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy the Signing Secret into Vercel environment variables as `STRIPE_WEBHOOK_SECRET`.
4. **Supabase Auth Configuration**:
   - In Supabase Dashboard > Authentication > URL Configuration:
     - Set **Site URL** to `https://<YOUR-DOMAIN>`.
     - Add `https://<YOUR-DOMAIN>/**` to **Redirect URLs**.
5. **Stripe Customer Portal Activation**:
   - In Stripe Dashboard > Settings > Customer Portal, activate the portal link and enable subscription cancellation and payment method updates.

---

## 7. Assumptions and Decisions (SPEC A1–A22)

The following locked assumptions and technical decisions guide the platform:
- **A1 (Currency)**: Indian Rupee (INR) only. Monthly fee is 49,900 paise (₹499), yearly fee is 499,000 paise (₹4,990). Prices are loaded dynamically from `plans` and never hardcoded.
- **A2 (Prize Pool & Charity Math)**: Prize pool is always 50% of an active member's monthly-equivalent fee (yearly / 12). Charity is the user's chosen percentage (minimum 10%). The remainder is retained as platform margin.
- **A3 (Draw Numbers & Matches)**: Draws generate 5 distinct integers between 1 and 45. A user's match count is how many drawn numbers appear in their 5 scores. Only distinct score values are counted; each drawn number matches at most once.
- **A4 (Draw Modes)**: Uniform Random mode or Algorithmic mode where number weight equals participant score occurrences plus 1.
- **A5 (Draw Eligibility)**: Requires an active subscription at draw time AND exactly 5 scores recorded. User scores are snapshotted into `draw_entries` at draw time.
- **A6 (Prize Tiers & Jackpot Rollover)**: Pool split: Tier 5 (40%), Tier 4 (35%), Tier 3 (25%). Equal split among tier winners, rounded down to the paisa. Unclaimed Tier 5 rolls over to next month's Tier 5 jackpot. Unclaimed Tier 4 and Tier 3 funds do not roll over.
- **A7 (Cadence & Simulation)**: Exactly one draw per calendar month. Draft status allows zero-side-effect simulations before publication.
- **A8 (Score Rules)**: Stableford scores (1–45) with dates. Exactly one score per user per date. Keeps the latest 5 scores by `played_on`. Inserting a score older than all 5 existing scores is rejected.
- **A9 (Charity Allocation)**: Chosen at signup (min 10%, max 50%). Sum of charity and prize pool (50%) cannot exceed 100%. Independent donations do not enter the prize pool.
- **A10 (Winner Claim Flow)**: Starts as `awaiting_proof` → `submitted` (scorecard photo) → `approved`/`rejected`. Payment transitions from `pending` to `paid`. Winners retain claim rights even if their subscription expires after the draw.
- **A11 (Active Status)**: Subscription is active when `status = 'active'` AND `current_period_end > now()`. Canceled subscriptions remain active until period end.
- **A12 (Single Source of Truth)**: Stripe is the authoritative source for billing; our Postgres database mirrors it via webhooks.
- **A13 (Date Restriction)**: Score dates cannot be in the future relative to Asia/Kolkata today.
- **A14 (Donations)**: One-off payments between ₹100 and ₹1,00,000 (10,000 to 10,000,000 paise). Anyone, including visitors, can donate.
- **A15 (Permissions)**: Any authenticated user can modify their supported charity and percentage. Only active subscribers can enter or modify scores.
- **A16 (Dynamic Settings)**: Charity range boundaries (`min_charity_percent` to `100 - prize_pool_percent`) are retrieved dynamically from `platform_settings`.
- **A17 (Draw Identifier)**: Draws are identified by calendar month (`YYYY-MM-01`).
- **A18 (Payout Execution)**: Admin marks prizes as paid manually in the portal after offline bank transfer.
- **A19 (Score Deduplication)**: Draw matching compares distinct score values against drawn numbers (max 5 matches).
- **A20 (Next Draw Dashboard)**: Displays the upcoming draw month and whether the member's current 5 scores qualify them.
- **A21 (Admin Protection)**: Admins cannot escalate subscriber roles via regular profile updates.
- **A22 (Admin Report RPC)**: Aggregates member count, subscription income, donations, and charity payouts in a single database RPC call.

---

## 8. Data and Security Notes

- **Row-Level Security (RLS)**: Enabled across all database tables. Public users can only read active charities, plans, and published draws. Subscribers can only read/write their own scores and read their own subscriptions, payments, and winnings.
- **Service Role Isolation**: The Supabase Service Role key is restricted exclusively to server-side code (`src/lib/supabase/admin.ts`). It is never exposed in client bundles or public environment variables.
- **Webhook-Driven State**: Subscription status, renewals, and invoice payments are reconciled asynchronously via verified Stripe webhook signatures.
- **Atomic Draw Publication**: Official draw publication occurs within a PostgreSQL transaction via `publish_draw()`, inserting draw records, snapshots, and winner records simultaneously to prevent partial state errors.

---

## 9. Testing

### Automated Tests
Run unit test suites covering draw logic, prize calculations, billing states, and charity formulas:
```bash
npm test
```

### Database Rule Verification
Execute the SQL test suite in `supabase/tests/scores_rule.sql` inside the Supabase SQL Editor to test the rolling-5 trigger, future date constraints, and duplicate date rejections.

### Manual Test Checklist
1. **Signup & Login**: Create a new account, pick a charity and percentage, log out, and log back in.
2. **Subscription Flow**: Subscribe to monthly and yearly plans using the Stripe test card; verify redirection to dashboard and billing portal.
3. **5-Score Rolling Logic**: Add 5 scores, add a 6th newer score (verifying oldest is dropped), try adding a duplicate date or future date (verifying friendly errors).
4. **Draw Simulation & Publish**: Log in as admin, run a simulation on `/admin/draws`, verify prize pool calculations, and publish the draw.
5. **Charity Contribution**: Verify payments log correct charity allocations and test a one-off donation on a charity profile.
6. **Winner Verification & Payout**: As a winning user, upload a proof scorecard on `/dashboard/winnings`; as admin, approve the proof on `/admin/winners` and mark it paid.
7. **User Dashboard**: Confirm all 5 dashboard modules reflect active subscription, score counts, and draw eligibility.
8. **Admin Panel**: Inspect user list, update user charity, and view aggregated figures in `/admin`.
9. **Responsive Layout**: Test interface at 375px mobile viewport width to verify tables scroll horizontally and navigation remains accessible.
10. **Error Handling**: Verify user-friendly error banners on invalid inputs, missing sessions, or 404 paths.

---

## 10. Known Limitations

- **Stripe Test Mode**: Built and verified using Stripe test mode credentials. Production deployment requires live API keys.
- **Manual Prize Payouts**: Payout status (`pending` → `paid`) is tracked and verified within the platform; actual bank disbursements are completed offline by platform administrators.
- **Platform Draw Numbers**: Winning numbers are generated by the platform engine (uniform random or score-weighted) rather than an external oracle or physical lottery machine.
