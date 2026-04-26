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

  // Two queries instead of a nested join: id_verification_submissions.user_id
  // references auth.users(id), and PostgREST can't auto-traverse the
  // transitive (auth.users.id == profiles.id) relationship to profiles.
  const { data: submissions, error: submissionsError } = await supabase
    .from("id_verification_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (submissionsError) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <p className="text-sm text-red">
          Failed to load: {submissionsError.message}
        </p>
      </div>
    );
  }

  const submissionRows = (submissions ?? []) as IdVerificationSubmission[];
  const userIds = Array.from(new Set(submissionRows.map((s) => s.user_id)));

  let profileById = new Map<string, { full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profileById = new Map(
      ((profiles ?? []) as { id: string; full_name: string | null }[]).map(
        (p) => [p.id, { full_name: p.full_name }],
      ),
    );
  }

  const rows: PendingRow[] = submissionRows.map((s) => ({
    ...s,
    user_full_name: profileById.get(s.user_id)?.full_name ?? null,
    user_email: null,
  }));

  return <VerificationsAdminClient rows={rows} />;
}
