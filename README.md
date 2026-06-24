# Golf Charity Draw Platform

Full-stack Next.js scaffold for the golf performance, charity contribution, and monthly prize draw prompt.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4
- Supabase Postgres, Auth, RLS, and RPCs
- Stripe Checkout, Billing Portal, PaymentIntents, and signature-verified webhooks
- Resend for email notifications
- Vercel deployment target

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in Supabase, Stripe, and Resend values.

3. Run Supabase migrations from `supabase/migrations` against a new Supabase project.

4. Create one Stripe product named `Platform Subscription`, then create monthly and yearly recurring prices. Put the price IDs in `.env.local`.

5. Enable Stripe Customer Portal, then forward webhooks to:

   ```text
   /api/stripe/webhook
   ```

6. Run locally:

   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example`. The service role key is used only in server route handlers and webhook processing.

## Schema Notes

The migration creates the prompt-required tables plus two auditable ledgers:

- `charity_allocations`: records subscription-derived charity contribution amounts.
- `subscription_invoices`: records paid subscription invoice revenue and the calculated prize-pool amount.

Those ledgers let admin reports and draw prize calculations use webhook-fed revenue instead of hardcoded amounts.

## Algorithm Verification

Implemented in `supabase/migrations/0001_core_schema.sql`:

- `upsert_golf_score(p_user_id, p_score, p_score_date)` validates ownership, writes one row per date, and trims to the five most recent scores atomically.
- `generate_winning_numbers(...)` supports random draws and algorithmic draws weighted by score frequency. Algorithmic mode supports `most_frequent` and `least_frequent`.
- `run_draw_simulation(...)` snapshots eligible latest-five entries and returns match counts while keeping results hidden from subscribers.
- `publish_draw(...)` locks entries, computes matches, splits pools 40/35/25, creates winner rows, and carries the 5-match pool forward when there is no 5-match winner.

## Assumptions

- Prize payouts are manual/off-platform. Admins track `payment_status`; Stripe does not transfer prize money.
- Prize-pool revenue is `subscription_invoices.prize_pool_amount`, calculated from paid subscription invoices after the charity allocation.
- Auth UI is intentionally left as a hook point in `/login` and `/signup`; the Supabase trigger and profile constraints are implemented.
- Deployment URL, test credentials, and live Supabase project IDs cannot be completed without external account access.

## Manual Testing Checklist

- Signup/login with Supabase Auth.
- Monthly and yearly Stripe Checkout with test cards.
- Stripe webhook idempotency with duplicate event delivery.
- Billing Portal cancellation/change flows.
- Score entry for 1-45 validation.
- Six score inserts confirm oldest score is removed.
- Duplicate date entry returns the edit-existing message.
- Draw simulation does not expose results to subscribers.
- Draw publish creates entries, winners, prize amounts, and published visibility.
- Zero 5-match winners rolls jackpot to the next draw.
- Charity selection and minimum 10% contribution.
- Subscription invoice creates charity allocation ledger rows.
- Winner proof upload and admin verification status.
- Admin reports render user count, charity totals, and historical match counts.
- Lapsed subscription cannot access `/dashboard`, `/scores`, or `/draws`.
- Responsive checks at mobile, tablet, and desktop widths.

## Current Status

The repository now contains the schema, core RPC algorithms, Stripe route handlers, subscription guards, server actions, and initial UI surfaces. Live deployment, seeded credentials, and end-to-end Stripe/Supabase verification require real project credentials.
