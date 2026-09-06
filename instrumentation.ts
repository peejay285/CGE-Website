import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error monitoring bootstrap (Next.js instrumentation
 * hook). Route handlers, server components and webhook errors all
 * land in Sentry via onRequestError. No-ops until the DSN is set.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
