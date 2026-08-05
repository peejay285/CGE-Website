import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isValidRedirectPath(path: string): boolean {
  // Must start with a single slash (relative path)
  // Must NOT start with // (protocol-relative URL)
  return path.startsWith("/") && !path.startsWith("//");
}

/**
 * The public origin of this request. Behind Firebase App Hosting (Cloud Run)
 * `request.url` reports the container's internal address (http://0.0.0.0:8080),
 * so prefer the proxy's x-forwarded-* headers — otherwise OAuth sign-ins get
 * redirected to an unreachable internal URL after the code exchange.
 */
function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Validate redirect URL to prevent open redirect attacks
  const redirectPath = isValidRedirectPath(next) ? next : "/";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
