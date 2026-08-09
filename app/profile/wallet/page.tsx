"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Trophy,
  Landmark,
  Check,
  ChevronRight,
  ShieldCheck,
  History,
  Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatPrice } from "@/lib/utils";
import { formatPlacement, formatTournamentDate } from "@/lib/esports-utils";
import type {
  Profile,
  Tournament,
  TournamentPayout,
  TournamentPayoutStatus,
} from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────
 * This page is the foundation for a future full CGE wallet;
 * today it surfaces tournament prize payouts only. */

type WalletPayout = TournamentPayout & {
  tournament?: Pick<Tournament, "id" | "title" | "date" | "game"> | null;
};

type WalletBankProfile = Pick<
  Profile,
  | "payout_account_name"
  | "payout_bank_name"
  | "payout_account_last4"
  | "payout_profile_verified_at"
>;

const PENDING_STATUSES: TournamentPayoutStatus[] = [
  "pending_review",
  "approved",
  "processing",
];

/* ── Status pipeline: Placement confirmed → Approved → Paid ── */

const PIPELINE_STEPS = ["Placement confirmed", "Approved", "Paid"] as const;

function pipelineProgress(status: TournamentPayoutStatus): number {
  switch (status) {
    case "pending_review":
      return 1; // placement confirmed, awaiting approval
    case "approved":
    case "processing":
      return 2; // approved, awaiting transfer
    case "paid":
      return 3;
    default:
      return 0;
  }
}

function PayoutPipeline({ status }: { status: TournamentPayoutStatus }) {
  const completed = pipelineProgress(status);
  return (
    <div className="flex items-center gap-1" aria-label={`Payout status: ${status.replace(/_/g, " ")}`}>
      {PIPELINE_STEPS.map((step, index) => {
        const isDone = index < completed;
        const isCurrent = index === completed;
        return (
          <div key={step} className="flex items-center gap-1">
            {index > 0 && (
              <span
                className={cn(
                  "h-px w-4 sm:w-6",
                  isDone || isCurrent ? "bg-cyan/50" : "bg-border"
                )}
              />
            )}
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border text-[8px]",
                  isDone
                    ? "border-green/40 bg-green/15 text-green"
                    : isCurrent
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-border bg-surface text-text-muted/50"
                )}
              >
                {isDone ? <Check size={9} /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider",
                  isDone ? "text-green" : isCurrent ? "text-cyan" : "text-text-muted/50"
                )}
              >
                {step}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Wallet summary (balance card foundation) ──────────── */

function WalletSummary({
  totalEarned,
  pendingTotal,
}: {
  totalEarned: number;
  pendingTotal: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-br from-gold/10 via-surface to-surface p-5">
      <Wallet
        size={96}
        className="pointer-events-none absolute -right-4 -top-4 text-gold/10"
        aria-hidden="true"
      />
      <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
        Total Earned
      </p>
      <p className="font-heading text-3xl font-bold text-gold">
        {formatPrice(totalEarned)}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Hourglass size={13} className="text-cyan" aria-hidden="true" />
        <p className="text-xs text-text-muted">
          Pending{" "}
          <span className="font-semibold text-cyan">{formatPrice(pendingTotal)}</span>
        </p>
      </div>
    </div>
  );
}

/* ── Payout rows ────────────────────────────────────────── */

function PendingPayoutCard({ payout }: { payout: WalletPayout }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {payout.tournament?.title || `Tournament #${payout.tournament_id}`}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {formatPlacement(payout.placement)} place
            {payout.tournament?.date
              ? ` · ${formatTournamentDate(payout.tournament.date)}`
              : ""}
          </p>
        </div>
        <p className="shrink-0 font-heading text-sm font-bold text-gold">
          {formatPrice(payout.net_amount)}
        </p>
      </div>
      <PayoutPipeline status={payout.status} />
    </div>
  );
}

function HistoryPayoutRow({ payout }: { payout: WalletPayout }) {
  const paidDate = payout.processed_at || payout.updated_at || payout.created_at;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/10">
        <Trophy size={14} className="text-gold" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text truncate">
          {payout.tournament?.title || `Tournament #${payout.tournament_id}`}
        </p>
        <p className="text-[11px] text-text-muted">
          {formatPlacement(payout.placement)} place ·{" "}
          {new Date(paidDate).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-heading text-sm font-bold text-green">
          +{formatPrice(payout.net_amount)}
        </p>
        <Badge color="green" size="sm">
          Paid
        </Badge>
      </div>
    </div>
  );
}

/* ── Linked bank account card ───────────────────────────── */

function LinkedBankCard({ profile }: { profile: WalletBankProfile | null }) {
  const hasAccount = Boolean(profile?.payout_account_last4);
  return (
    <div className="rounded-xl border border-border bg-surface-alt p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green/25 bg-green/10">
          <Landmark size={18} className="text-green" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">
            Payout Account
          </p>
          {hasAccount ? (
            <p className="text-sm font-semibold text-text truncate">
              {profile?.payout_bank_name || "Bank"} ····
              {profile?.payout_account_last4}
            </p>
          ) : (
            <p className="text-sm text-text-muted">No bank account linked yet</p>
          )}
        </div>
        <Link
          href="/profile/payout"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-cyan hover:text-cyan/80"
        >
          {hasAccount ? "Change" : "Add"}
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
        <ShieldCheck size={12} className="shrink-0 text-cyan" aria-hidden="true" />
        Changes trigger a security SMS.
      </p>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function WalletPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<WalletPayout[]>([]);
  const [bankProfile, setBankProfile] = useState<WalletBankProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Signed out: the page early-returns a sign-in view before `loading` is
    // ever read, so there's nothing to reset here.
    if (!user) return;
    const userId = user.id;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [payoutResult, profileResult] = await Promise.all([
        supabase
          .from("tournament_payouts")
          .select("*, tournament:tournaments(id, title, date, game)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select(
            "payout_account_name, payout_bank_name, payout_account_last4, payout_profile_verified_at"
          )
          .eq("id", userId)
          .maybeSingle(),
      ]);

      setPayouts((payoutResult.data ?? []) as WalletPayout[]);
      setBankProfile((profileResult.data as WalletBankProfile | null) ?? null);
      setLoading(false);
    }

    load();
  }, [user]);

  // Sign-in guard, matching the other profile subpages.
  if (!user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Wallet size={32} className="mx-auto mb-3 text-text-muted" />
          <h2 className="text-lg font-bold font-heading text-text mb-2">
            Sign in to view your winnings
          </h2>
          <p className="text-sm text-text-muted mb-6">
            Track your tournament prize money and payout status.
          </p>
          <Button
            variant="primary"
            onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const pending = payouts.filter((p) => PENDING_STATUSES.includes(p.status));
  const paid = payouts.filter((p) => p.status === "paid");
  const totalEarned = paid.reduce((sum, p) => sum + p.net_amount, 0);
  const pendingTotal = pending.reduce((sum, p) => sum + p.net_amount, 0);
  const hasWinnings = pending.length > 0 || paid.length > 0;

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} />
          Back to profile
        </Link>

        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-gold" />
          <h1 className="text-lg font-bold font-heading text-text">My Winnings</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : !hasWinnings ? (
          <>
            <WalletSummary totalEarned={0} pendingTotal={0} />
            <EmptyState
              icon="🏆"
              title="No winnings yet"
              subtitle="Enter a CGE tournament and your prize money will land here."
              action={{
                label: "Browse tournaments",
                onClick: () => router.push("/esports"),
              }}
            />
            <LinkedBankCard profile={bankProfile} />
          </>
        ) : (
          <>
            <WalletSummary totalEarned={totalEarned} pendingTotal={pendingTotal} />

            {/* Pending winnings */}
            {pending.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  <Hourglass size={13} className="text-cyan" aria-hidden="true" />
                  Pending Winnings
                </h2>
                {pending.map((payout) => (
                  <PendingPayoutCard key={payout.id} payout={payout} />
                ))}
              </section>
            )}

            {/* History */}
            {paid.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  <History size={13} className="text-green" aria-hidden="true" />
                  Payout History
                </h2>
                <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
                  {paid.map((payout) => (
                    <HistoryPayoutRow key={payout.id} payout={payout} />
                  ))}
                </div>
              </section>
            )}

            <LinkedBankCard profile={bankProfile} />
          </>
        )}
      </div>
    </div>
  );
}
