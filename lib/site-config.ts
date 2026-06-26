const DEFAULT_SITE_URL = "https://cge.ng";

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
  return process.env.NODE_ENV === "production" && !!process.env.VERCEL;
}

export function isBetaMode() {
  return (
    isTruthy(process.env.NEXT_PUBLIC_BETA_MODE) ||
    process.env.NEXT_PUBLIC_SITE_PHASE === "beta" ||
    process.env.VERCEL_ENV === "preview"
  );
}

export function shouldDisableIndexing() {
  if (isBetaMode()) return true;
  return isFalsey(process.env.NEXT_PUBLIC_ALLOW_INDEXING);
}
