import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/// Gate a server component or route handler to admin-flagged users.
/// Redirects to /profile (with a `not_admin` query) for non-admins;
/// throws if the call is unauthenticated.
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect("/profile?not_admin=1");
  }

  return { user, supabase };
}
