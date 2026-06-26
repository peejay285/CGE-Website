import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Create a Supabase client for a server request.
 *
 * Web requests continue to use the SSR cookie session. Native clients can
 * authenticate the same API routes with `Authorization: Bearer <access-token>`.
 * This keeps pricing, capacity, rate limiting, and payment initialization on
 * the server without forcing the mobile app to duplicate privileged logic.
 */
export async function createServerSupabaseClient(request?: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    throw new Error(
      "Missing Supabase environment variables. Check your .env.local file."
    );
  }

  const authorization = request?.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have proxy refreshing sessions.
        }
      },
    },
  });
}
