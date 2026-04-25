import { requireAdmin } from "@/lib/require-admin";
import { VerificationsAdminClient } from "./client";
import type { IdVerificationSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PendingRow extends IdVerificationSubmission {
  user_full_name: string | null;
  user_email: string | null;
}

export default async function VerificationsAdminPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("id_verification_submissions")
    .select(
      "*, user:profiles!user_id(id, full_name)",
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <p className="text-sm text-red">Failed to load: {error.message}</p>
      </div>
    );
  }

  const rows: PendingRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as IdVerificationSubmission),
    user_full_name:
      ((r.user as { full_name?: string } | undefined)?.full_name) ?? null,
    user_email: null,
  }));

  return <VerificationsAdminClient rows={rows} />;
}
