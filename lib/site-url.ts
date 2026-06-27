import { getConfiguredSiteUrl, isProductionDeployment } from "@/lib/site-config";

/**
 * Build an absolute URL for the running site.
 *
 * Order of precedence:
 *   1. NEXT_PUBLIC_SITE_URL — set this in env when you have a stable public
 *      URL (production domain, ngrok URL during dev). Anything that needs to
 *      be reachable from outside the dev machine (QR codes, SMS links,
 *      Paystack callbacks) should resolve through this.
 *   2. The request's x-forwarded-proto + host headers — works server-side
 *      when the request is itself coming through ngrok / a hosting provider.
 *   3. http://localhost:3000 — last-resort dev fallback.
 *
 * Strips any trailing slash from the base so "/foo" + base joins cleanly.
 */
export function absoluteUrl(path: string, headers?: Headers): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const envBase = getConfiguredSiteUrl();
  if (envBase) return `${envBase}${normalizedPath}`;

  if (isProductionDeployment()) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for production absolute URLs");
  }

  if (headers) {
    const proto = headers.get("x-forwarded-proto") ?? "https";
    const host = headers.get("host");
    if (host) {
      return `${proto}://${host}${normalizedPath}`;
    }
  }

  return `http://localhost:3000${normalizedPath}`;
}
