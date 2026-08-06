const DEFAULT_SITE_URL = "https://playcge.com";

function normalizeUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isTruthy(value: string | undefined) {
  return value === "1" || value === "true" || value === "yes";
}

function isFalsey(value: string | undefined) {
  return value === "0" || value === "false" || value === "no";
}

export function getConfiguredSiteUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function getCanonicalSiteUrl() {
  return getConfiguredSiteUrl() ?? DEFAULT_SITE_URL;
}

export function isProductionDeployment() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SITE_PHASE === "production"
  );
}

export function isBetaMode() {
  return (
    isTruthy(process.env.NEXT_PUBLIC_BETA_MODE) ||
    process.env.NEXT_PUBLIC_SITE_PHASE === "beta" ||
    process.env.VERCEL_ENV === "preview"
  );
}

// Beta waiting room: while the site phase is "beta", signed-in users need
// profiles.beta_approved before they can book, register, list, or post.
// Flip NEXT_PUBLIC_SITE_PHASE off "beta" at launch and the gate is a no-op.
export function isBetaGateActive() {
  return process.env.NEXT_PUBLIC_SITE_PHASE === "beta";
}

export function shouldDisableIndexing() {
  if (isBetaMode()) return true;
  return isFalsey(process.env.NEXT_PUBLIC_ALLOW_INDEXING);
}
