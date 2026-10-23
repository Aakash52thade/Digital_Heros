# Digital Heroes

Digital Heroes is a charity-first subscription platform where users track their golf scores (Stableford), participate in monthly prize draws, and contribute a portion of their subscription to their chosen charity.

## 1. Setup & Installation

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `.env.local` with your Supabase credentials, admin/test accounts, and Stripe API keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
3. Install dependencies:
   ```bash
   npm install
   ```

## 2. Run Database Migrations (SQL)

Execute migrations in your Supabase project (via SQL Editor):
- `supabase/migrations/0001_init.sql` (Phase 1 core schema)
- `supabase/migrations/0002_phase2.sql` (Phase 2 charity percentage check and nullable payment charity)

## 3. Seed Database & Stripe Products

1. Seed initial database data:
   ```bash
   npm run seed
   ```
2. Setup Stripe products and recurring prices:
   ```bash
   npm run stripe:setup
   ```
   This creates/finds the "Digital Heroes" product in Stripe, creates recurring INR prices for monthly (`dh_monthly`) and yearly (`dh_yearly`) plans, and links their `stripe_price_id` into the `plans` table.

## 4. Stripe Webhooks

### Local Testing
Forward webhook events to your local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the webhook signing secret output by the CLI (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Production Webhook
Configure your production endpoint in the Stripe Dashboard:
- **URL**: `https://your-domain.com/api/stripe/webhook`
- **Events to subscribe**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

## 5. Testing & Verification

- Run unit tests:
  ```bash
  npm test
  ```
- Check types:
  ```bash
  npm run typecheck
  ```
- Build production bundle:
  ```bash
  npm run build
  ```
- Run local dev server:
  ```bash
  npm run dev
  ```

## 6. Deployment

1. Push code to your Git repository.
2. Link the repository to Vercel.
3. Configure environment variables matching `.env.example`.
4. Deploy!
