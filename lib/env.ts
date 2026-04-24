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

const optionalEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  GIVEAWAY_ADMIN_SECRET: z.string().optional(),
  MODAL_AI_ENDPOINT: z.string().url().optional(),
  MODAL_AUTH_TOKEN: z.string().optional(),
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
