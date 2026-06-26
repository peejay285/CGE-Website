import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .refine((v) => !v.includes("placeholder"), "Supabase URL cannot be a placeholder"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short"),
});

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
);

const optionalEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(20).optional()
  ),
  PAYSTACK_SECRET_KEY: optionalString,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: optionalString,
  GIVEAWAY_ADMIN_SECRET: optionalString,
  MODAL_AI_ENDPOINT: optionalUrl,
  MODAL_AUTH_TOKEN: optionalString,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_BETA_MODE: optionalString,
  NEXT_PUBLIC_SITE_PHASE: optionalString,
  NEXT_PUBLIC_ALLOW_INDEXING: optionalString,
  TERMII_API_KEY: optionalString,
  TERMII_SENDER_ID: optionalString,
  // Distributed rate-limiting (Upstash Redis). Required for production —
  // without these the limiter falls back to a per-process Map.
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  // Cloudflare Turnstile site key. Used at signup as a bot gate.
  // Configure the matching secret in Supabase dashboard → Authentication
  // → Captcha (Supabase verifies the token server-side).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
});

const productionEnvSchema = envSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PAYSTACK_SECRET_KEY: z.string().min(10),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(10),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(5),
});

function validateEnv() {
  const required = envSchema.safeParse(process.env);
  if (!required.success) {
    console.error(
      "Missing or invalid required environment variables:\n",
      required.error.flatten().fieldErrors
    );
    return false;
  }

  const optional = optionalEnvSchema.safeParse(process.env);
  if (!optional.success) {
    console.error(
      "Invalid optional environment variables:\n",
      optional.error.flatten().fieldErrors
    );
    return false;
  }

  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    const production = productionEnvSchema.safeParse(process.env);
    if (!production.success) {
      console.error(
        "Missing or invalid production environment variables:\n",
        production.error.flatten().fieldErrors
      );
      return false;
    }
  }

  return true;
}

export const isEnvValid = validateEnv();

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("placeholder")) {
    return null;
  }

  return { url, anonKey };
}
