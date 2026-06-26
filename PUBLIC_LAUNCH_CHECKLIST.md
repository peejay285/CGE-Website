# CGE Website Public Launch Checklist

Last checked locally: 2026-06-11

## Current Launch Decision

Public launch is currently blocked by deployment/config/ops items outside the codebase.

What is satisfied:

- Local build/lint/test/high-audit gates pass.
- Supabase security readiness SQL now passes in the target DB.
- Code-level exposure points from the audit have been hardened.
- `npm run launch:env` has been added to verify launch envs without printing secret values.

What is not yet satisfied:

- Production domain DNS/SSL is not resolving from this environment for `https://cge.ng` or `https://www.cge.ng`.
- Vercel production environment variables cannot be verified from this workspace because Vercel CLI is not installed/configured here.
- This repository has no Git remote configured locally.
- The working tree is not clean, so the release branch is not yet an intentional deploy artifact.
- Local launch env check fails for public launch settings.
- Public smoke tests cannot be run until a deployed production/preview URL is available.

## Current Local Gate Status

- [x] `npm run lint -- --quiet` passes.
- [x] `npm run test` passes: 5 files, 30 tests.
- [x] `npm run build` passes on Next 16.2.9.
- [x] `npm audit --audit-level=high` passes.
- [x] `npm run launch:env` exists and runs.
- [x] Supabase `_verify-security-readiness.sql` passes in the target DB.
- [ ] `npm audit --audit-level=moderate` has a known nested Next/PostCSS advisory. Do not run `npm audit fix --force`; npm proposes downgrading Next to 9.3.3.

## Public Launch Blockers

- [ ] Release branch is clean and intentional.
  - Current workspace has many modified and untracked files. Review, commit, or exclude everything before deploying.
  - Current branch: `master`.
  - Current local Git remote check: no remote is configured.
  - Current status: blocked until intended files are committed and deploy source is confirmed.

- [ ] Production Vercel environment variables are verified.
  - Required:
    - `NEXT_PUBLIC_SITE_URL`
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `PAYSTACK_SECRET_KEY`
    - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
    - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - Public launch indexing:
    - `NEXT_PUBLIC_BETA_MODE=false`
    - `NEXT_PUBLIC_SITE_PHASE=production`
    - `NEXT_PUBLIC_ALLOW_INDEXING=true`
  - Optional feature envs if enabled:
    - `MODAL_AI_ENDPOINT`
    - `MODAL_AUTH_TOKEN`
    - `TERMII_API_KEY`
    - `TERMII_SENDER_ID`
  - Current `npm run launch:env` result:
    - `NEXT_PUBLIC_SITE_URL`: missing.
    - `UPSTASH_REDIS_REST_URL`: missing.
    - `UPSTASH_REDIS_REST_TOKEN`: missing.
    - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: missing.
    - `NEXT_PUBLIC_BETA_MODE`: missing; public launch expects `false`.
    - `NEXT_PUBLIC_SITE_PHASE`: missing; public launch expects `production`.
    - `NEXT_PUBLIC_ALLOW_INDEXING`: missing; public launch expects `true`.
    - Paystack keys: test keys detected locally; public launch needs live keys.
    - Supabase keys: set locally.
    - Termii keys: set locally.
    - Modal keys: not set locally.
  - Vercel production envs still need dashboard/CLI confirmation.

- [ ] Production provider callbacks are verified.
  - Supabase Auth redirect URLs include:
    - `https://<production-domain>/auth/callback`
  - Paystack callback URL domain is production.
  - Paystack webhook URL is:
    - `https://<production-domain>/api/paystack/webhook`
  - Cloudflare Turnstile site key domain matches production.
  - Supabase CAPTCHA/Turnstile secret is configured in Supabase dashboard.
  - Current status: blocked until the production domain resolves and provider dashboards are configured.

- [x] Production Supabase security readiness is verified.
  - `_verify-security-readiness.sql` returns all `PASS`.

- [ ] Production Supabase operations are verified.
  - Admin user(s) have `profiles.is_admin = true`.
  - Storage buckets exist with expected privacy and MIME limits.
  - Production backups are enabled.
  - RLS is enabled on user-owned tables.
  - Current status: security SQL passed; admin account and backup settings still need dashboard confirmation.

## Required Public Smoke Test

Run these on the deployed public domain before opening to everyone:

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

- [ ] Vercel deployment protection is disabled only when ready for public launch.
- [ ] Domain DNS is pointed at the production deployment.
  - Current check: `https://cge.ng` failed DNS resolution from this environment.
  - Current check: `https://www.cge.ng` failed DNS resolution from this environment.
- [ ] SSL is active on the production domain.
  - Current status: cannot be satisfied until DNS resolves.
- [ ] Vercel function logs are monitored during launch.
- [ ] Paystack dashboard is monitored for failed webhooks.
- [ ] Supabase logs are monitored for RLS/API errors.
- [ ] Admin account recovery path is known.
- [ ] Support/contact path is visible and working.
- [ ] Rollback plan is agreed: previous stable Vercel deployment can be promoted.
- [ ] Moderate PostCSS advisory is documented and tracked for a safe upstream fix.

## Current Verdict

The codebase is beta-ready and close to public-ready. Public launch should wait until:

1. The release branch is clean.
2. Production env vars are verified in Vercel.
3. Provider callbacks are verified on the production domain.
4. The required public smoke test passes end to end.
5. DNS and SSL are working on the public domain.
