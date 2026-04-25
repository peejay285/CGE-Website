"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  Loader2,
  Clock,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { IdVerificationSubmission, Profile } from "@/lib/types";

const ID_TYPES = ["NIN slip", "Driver's licence", "Voter's card", "Passport"];

export default function VerificationPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<IdVerificationSubmission[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: subs }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, is_id_verified, id_verified_at, premium_tier, premium_expires_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("id_verification_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false }),
    ]);
    setProfile((prof as Profile | null) ?? null);
    setSubmissions((subs as IdVerificationSubmission[] | null) ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPremium =
    profile?.premium_tier === "premium" &&
    profile?.premium_expires_at != null &&
    new Date(profile.premium_expires_at) > new Date();

  const pendingSubmission = submissions.find((s) => s.status === "pending");

  async function handleSubmit() {
    if (!user || !idFile) return;
    setSubmitting(true);
    try {
      const folder = `${user.id}/${Date.now()}`;
      const idPath = `${folder}/id.${idFile.name.split(".").pop()}`;
      const { error: idErr } = await supabase.storage
        .from("verification-docs")
        .upload(idPath, idFile);
      if (idErr) throw idErr;

      const supportingPaths: string[] = [];
      for (const f of supportingFiles) {
        const sp = `${folder}/support_${supportingPaths.length}.${f.name.split(".").pop()}`;
        const { error: sErr } = await supabase.storage
          .from("verification-docs")
          .upload(sp, f);
        if (sErr) throw sErr;
        supportingPaths.push(sp);
      }

      const { error: insertErr } = await supabase
        .from("id_verification_submissions")
        .insert({
          user_id: user.id,
          id_document_url: idPath,
          supporting_doc_urls: supportingPaths,
        });
      if (insertErr) throw insertErr;

      toast.success("Submitted. We'll review within 48 hours.");
      setIdFile(null);
      setSupportingFiles([]);
      refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to submit verification",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-text mb-2">
            Sign in to verify your profile
          </h2>
          <Button
            variant="primary"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-auth-modal"))
            }
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} />
          Back to profile
        </Link>

        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-cyan" />
          <h1 className="text-lg font-bold font-heading text-text">
            Verified Profile
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-cyan">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            <CurrentStatus
              isVerified={!!profile?.is_id_verified}
              isPremium={isPremium}
              pendingSubmission={pendingSubmission}
            />

            {!isPremium && (
              <PremiumGateBanner />
            )}

            {isPremium && !profile?.is_id_verified && !pendingSubmission && (
              <SubmissionForm
                idFile={idFile}
                supportingFiles={supportingFiles}
                submitting={submitting}
                onIdChange={setIdFile}
                onSupportingChange={setSupportingFiles}
                onSubmit={handleSubmit}
              />
            )}

            {submissions.length > 0 && (
              <SubmissionHistory submissions={submissions} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CurrentStatus({
  isVerified,
  isPremium,
  pendingSubmission,
}: {
  isVerified: boolean;
  isPremium: boolean;
  pendingSubmission?: IdVerificationSubmission;
}) {
  if (isVerified) {
    return (
      <div className="rounded-xl border border-green/30 bg-green/5 p-4 flex items-start gap-3">
        <Check size={18} className="text-green shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green">
            Your profile is verified
          </p>
          <p className="text-xs text-text-muted mt-1">
            Your verified badge appears on listings, swap proposals, and your
            seller profile.
          </p>
        </div>
      </div>
    );
  }

  if (pendingSubmission) {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex items-start gap-3">
        <Clock size={18} className="text-gold shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gold">
            Review pending
          </p>
          <p className="text-xs text-text-muted mt-1">
            Your documents are with our team. We aim to decide within 48 hours.
          </p>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt p-4 flex items-start gap-3">
      <ShieldCheck size={18} className="text-cyan shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-text">
          Submit your ID to get verified
        </p>
        <p className="text-xs text-text-muted mt-1">
          Upload a clear photo of your ID and any supporting documents. A team
          member will review within 48 hours.
        </p>
      </div>
    </div>
  );
}

function PremiumGateBanner() {
  return (
    <div className="rounded-xl border border-magenta/30 bg-magenta/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={16} className="text-magenta" />
        <p className="text-sm font-semibold text-magenta">
          Verified profiles are a premium perk
        </p>
      </div>
      <p className="text-xs text-text-muted mb-3 leading-relaxed">
        Upgrade to Premium to unlock manual ID verification — plus higher
        listing limits, priority placement, and featured swap matches.
      </p>
      <Link href="/profile/upgrade">
        <Button variant="primary" size="sm">
          See Premium
        </Button>
      </Link>
    </div>
  );
}

function SubmissionForm({
  idFile,
  supportingFiles,
  submitting,
  onIdChange,
  onSupportingChange,
  onSubmit,
}: {
  idFile: File | null;
  supportingFiles: File[];
  submitting: boolean;
  onIdChange: (f: File | null) => void;
  onSupportingChange: (fs: File[]) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-alt p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Accepted ID types
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ID_TYPES.map((t) => (
            <Badge key={t} color="cyan" size="sm">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <FilePicker
        label="ID document (required)"
        file={idFile}
        onChange={onIdChange}
      />

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          Supporting documents (optional)
        </label>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) =>
            onSupportingChange(Array.from(e.target.files ?? []))
          }
          className="block w-full text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cyan/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cyan hover:file:bg-cyan/25 file:cursor-pointer"
        />
        {supportingFiles.length > 0 && (
          <p className="text-[11px] text-text-muted mt-2">
            {supportingFiles.length} file
            {supportingFiles.length === 1 ? "" : "s"} selected
          </p>
        )}
      </div>

      <Button
        variant="primary"
        fullWidth
        disabled={!idFile || submitting}
        onClick={onSubmit}
      >
        {submitting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {submitting ? "Submitting..." : "Submit for review"}
      </Button>
    </div>
  );
}

function FilePicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 block">
        {label}
      </label>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cyan/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cyan hover:file:bg-cyan/25 file:cursor-pointer"
      />
      {file && (
        <p className="text-[11px] text-text-muted mt-2">
          {file.name} · {(file.size / 1024).toFixed(0)} KB
        </p>
      )}
    </div>
  );
}

function SubmissionHistory({
  submissions,
}: {
  submissions: IdVerificationSubmission[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        Submission history
      </h3>
      <div className="space-y-2">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-border bg-surface p-3 flex items-start gap-3"
          >
            <StatusIcon status={s.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text capitalize">
                {s.status}
              </p>
              <p className="text-[11px] text-text-muted">
                {new Date(s.submitted_at).toLocaleString()}
              </p>
              {s.status === "rejected" && s.rejection_reason && (
                <p className="text-xs text-red mt-1">
                  Reason: {s.rejection_reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <Check size={16} className={cn("text-green mt-0.5")} />;
  if (status === "rejected") return <X size={16} className="text-red mt-0.5" />;
  return <Clock size={16} className="text-gold mt-0.5" />;
}
