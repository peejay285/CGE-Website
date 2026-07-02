# CGE Lounge

Web platform for the CGE gaming lounge (Nigeria): book lounge sessions, run
esports tournaments with paid entry and prize payouts, trade games on a
swap-first marketplace, and hang out in the community feed.

## Features

- **Lounge bookings** — zone/slot booking with Paystack payment, SMS receipts
  (Termii) and QR receipt pages.
- **Esports tournaments** — solo and team registration (free or paid entry),
  bracket generation, match reporting with dispute resolution, and a prize
  payout pipeline (placements → draft → approval → Paystack transfer).
- **Marketplace** — swap-first game listings, escrowed swap lifecycle, and
  CGE-assisted swaps.
- **Community** — feed, events, moderation, and anti-spam controls.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + Tailwind CSS 4
- [Supabase](https://supabase.com) — Postgres, Auth, RLS, storage
- [Paystack](https://paystack.com) — payments (charges + transfers, NGN)
- [Upstash Redis](https://upstash.com) — distributed rate limiting
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) — signup CAPTCHA
- [Termii](https://termii.com) — SMS notifications
- Vitest for tests

## Getting started

```bash
cp .env.example .env.local   # fill in the values
npm run dev                  # start the dev server
npm test                     # run the vitest suite
npm run launch:env           # verify env readiness for public launch
```

Environment variables are documented in `.env.example`. Supabase URL/keys and
`PAYSTACK_SECRET_KEY` are the minimum for local dev; Upstash, Turnstile, and
Termii degrade gracefully when unset (in-memory rate limits, no CAPTCHA, no
SMS) — fine locally, **not** for production.

## Database migrations

Schema lives in `supabase/` as ordered, idempotent SQL files (run them in the
Supabase SQL editor). Start with `migration.sql`, then apply the feature
migrations; `_verify-all-migrations.sql` and `_verify-security-readiness.sql`
check that a database is up to date.

## Launch

See `PUBLIC_LAUNCH_CHECKLIST.md` for the full go-live gate: hosting (Firebase
App Hosting), domain, live Paystack keys, provider dashboard configuration,
and required production env vars.

## Security notes

- **Turnstile**: the site key (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) only renders
  the widget. The matching **secret** must be enabled in the Supabase
  dashboard → Authentication → Captcha, or the CAPTCHA is not enforced
  server-side.
- **Payout approval rules** (see
  `supabase/payout-approval-hardening-migration.sql`):
  - Tournament hosts can assign placements and generate payout drafts, and can
    approve drafts only for **free** tournaments.
  - Any tournament with a paid entry fee / collected prize pool requires a
    **CGE admin** to approve the draft, and releasing funds (Paystack
    transfer) is admin-only.
  - Payout rows where the payee is the tournament host are flagged
    (`host_is_payee`) and always require admin approval; the flag is surfaced
    in the payout ledger UI.
- **Payout account changes** are audit-logged to `payout_recipient_changes`
  (service-role writes only) and trigger an SMS notice to the account owner.
- **Paystack webhook** verifies the `x-paystack-signature` HMAC, re-verifies
  each transaction against the Paystack API, and enforces idempotency and
  amount checks before marking anything paid.
