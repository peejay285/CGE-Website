import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side error monitoring. No-op until NEXT_PUBLIC_SENTRY_DSN is
 * set. Errors only — tracing and session replay stay off to keep the
 * bundle and the testers' data bills lean.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
