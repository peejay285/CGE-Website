# CGE Website Public Launch Checklist

Last checked locally: 2026-06-27

## Current Launch Decision

The website codebase is beta-ready locally, but public launch is still blocked by hosting, domain, live payment, anti-abuse, and provider-dashboard configuration.

Important hosting decision: use Firebase App Hosting, not classic Firebase Hosting. This app has Next.js server-rendered pages, middleware, and API routes such as Paystack webhooks, booking creation, tournament payout release, AI concierge, and admin operations. Static Firebase Hosting alone is not the right fit.

## Current Local Gate Status

- [x] Git remote is configured: `https://github.com/peejay285/CGE-Website.git`.
- [x] Current branch: `master`.
- [x] `npm run lint` passes with warnings only.
- [x] `npm run test` passes: 7 files, 40 tests.
- [x] `npm run build` passes on Next 16.2.9.
- [x] `npm audit --audit-level=high` passes.
- [x] Supabase security readiness SQL previously passed in the target DB.
- [x] Production strictness is provider-neutral now: `NEXT_PUBLIC_SITE_PHASE=production` controls public-launch behavior, not Vercel-only environment variables.
- [ ] `npm run launch:env` fails until production hosting/domain environment is configured.

## Current `npm run launch:env` Result

Passing locally:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `TERMII_API_KEY`
- `TERMII_SENDER_ID`

Missing or not public-launch ready:

- `NEXT_PUBLIC_SITE_URL`: missing
- `UPSTASH_REDIS_REST_URL`: missing
- `UPSTASH_REDIS_REST_TOKEN`: missing
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: missing
- `NEXT_PUBLIC_BETA_MODE`: expected `false`
- `NEXT_PUBLIC_SITE_PHASE`: expected `production`
- `NEXT_PUBLIC_ALLOW_INDEXING`: expected `true`
- Paystack keys: local keys are test keys; public launch needs `sk_live_...` and `pk_live_...`
- `MODAL_AI_ENDPOINT`: optional, not set locally
- `MODAL_AUTH_TOKEN`: optional, not set locally

## Recommended Firebase/App Hosting Path

- [ ] Create or choose the Firebase project.
- [ ] Upgrade the Firebase project to Blaze/pay-as-you-go if App Hosting requests it.
- [ ] In Firebase console, go to Hosting & Serverless → App Hosting.
- [ ] Create an App Hosting backend connected to `peejay285/CGE-Website.git`.
- [ ] Set the live branch intentionally, likely `master` unless you decide to rename/migrate to `main`.
- [ ] Keep automatic rollouts on only after the release branch is clean and intentional.
- [ ] Deploy first to Firebase’s generated `hosted.app` URL.
- [ ] Run smoke tests on the generated URL before buying/connecting the final domain.
- [ ] After smoke tests pass, connect the custom domain in App Hosting and update provider callbacks.

## Required App Hosting Environment

Set these in Firebase App Hosting environment settings or through `apphosting.yaml` + Cloud Secret Manager. Do not commit real secret values.

Required public values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_BETA_MODE=false`
- `NEXT_PUBLIC_SITE_PHASE=production`
- `NEXT_PUBLIC_ALLOW_INDEXING=true`

Required secrets/server-only values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional feature values:

- `MODAL_AI_ENDPOINT`
- `MODAL_AUTH_TOKEN`
- `TERMII_API_KEY`
- `TERMII_SENDER_ID`

## Public Launch Blockers

- [ ] Release branch is clean, committed, and pushed.
- [ ] Firebase App Hosting backend exists and deploys from GitHub.
- [ ] Production/live App Hosting environment variables are configured.
- [ ] Live Paystack keys are configured.
- [ ] Upstash Redis is configured so production rate limits are distributed instead of in-memory.
- [ ] Cloudflare Turnstile site key is configured for the production domain.
- [ ] Supabase CAPTCHA/Turnstile secret is configured in Supabase dashboard.
- [ ] Production domain is purchased and connected to Firebase App Hosting.
- [ ] DNS and SSL are verified by Firebase.
- [ ] Public smoke tests pass end to end.

## Provider Callback Checklist

When the Firebase generated URL or final domain is known, update:

- Supabase Auth redirect URL:
  - `https://<domain>/auth/callback`
- Paystack callback URL:
  - `https://<domain>/payment/mobile-return`
- Paystack webhook URL:
  - `https://<domain>/api/paystack/webhook`
- Cloudflare Turnstile allowed domains:
  - `<domain>`
  - `www.<domain>` if used
- Mobile app production API base URL:
  - `https://<domain>`

## Required Public Smoke Test

Run these on the deployed Firebase URL first, then repeat critical payment/auth checks after the custom domain is connected:

- [ ] Signup with Turnstile enabled.
- [ ] Login/logout/session persistence.
- [ ] Profile update.
- [ ] Lounge availability display.
- [ ] Lounge booking with pay-at-venue.
- [ ] Lounge booking with Paystack.
- [ ] Paystack webhook marks booking paid.
- [ ] Booking receipt opens with tokenized QR link.
- [ ] Staff/admin mark pay-at-venue booking as paid.
- [ ] Premium upgrade payment and webhook.
- [ ] Tournament paid registration.
- [ ] Team tournament paid registration if enabled.
- [ ] Marketplace listing create/edit/delete.
- [ ] Marketplace messages.
- [ ] Swap assist payment and activation.
- [ ] Payout profile creation.
- [ ] Tournament payout release with admin account.
- [ ] Community post, comment, report, and admin moderation.
- [ ] ID verification upload and admin review.
- [ ] SMS receipt link if Termii is enabled.
- [ ] AI concierge if Modal is enabled.

## Operations Checklist

- [ ] Firebase App Hosting logs are monitored during launch.
- [ ] Paystack dashboard is monitored for failed webhooks.
- [ ] Supabase logs are monitored for RLS/API errors.
- [ ] Admin account recovery path is known.
- [ ] Support/contact path is visible and working.
- [ ] Rollback plan is agreed: promote the previous stable App Hosting rollout.
- [ ] Moderate dependency advisories remain tracked (`@babel/core`, `js-yaml`, Next nested PostCSS); do not run `npm audit fix --force` if it proposes unsafe framework downgrades.

## Current Verdict

Proceed in this order:

1. Commit and push the website readiness changes.
2. Create Firebase App Hosting backend and deploy to the generated `hosted.app` URL.
3. Configure beta/staging env first and smoke test.
4. Buy/connect the domain.
5. Switch to production env flags/live Paystack/live callbacks.
6. Repeat public smoke tests before opening beta testers broadly.
