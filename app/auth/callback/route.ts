import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isValidRedirectPath(path: string): boolean {
  // Must start with a single slash (relative path)
  // Must NOT start with // (protocol-relative URL)
  return path.startsWith("/") && !path.startsWith("//");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
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
