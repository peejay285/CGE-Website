"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/lib/types";
import type { TournamentWithCount } from "@/lib/esports-utils";
import {
  estimatePrizePool,
  formatTournamentDate,
  formatTournamentTime,
  getFilledCount,
} from "@/lib/esports-utils";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface FeaturedRow extends Tournament {
  tournament_registrations?: Array<{ count: number }>;
  tournament_team_registrations?: Array<{ count: number }>;
}

/**
 * Featured event banner for the homepage. Promotes the soonest upcoming
 * open tournament; when none exists (or the fetch fails) it falls back
 * to an Invasion Tournament brand teaser so the slot never sits empty.
 */
export function FeaturedEvent() {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentWithCount | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchFeatured() {
      try {
        const supabase = createClient();
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("tournaments")
          .select(
            "*, tournament_registrations(count), tournament_team_registrations(count)",
          )
          .eq("status", "open")
          .gte("date", now)
          .order("date", { ascending: true })
          .limit(1);

        if (error) throw error;

        const row = (data as FeaturedRow[] | null)?.[0];
        if (cancelled) return;

        if (!row) {
          setTournament(null);
        } else {
          const teamSize =
            typeof row.team_size === "number"
              ? row.team_size
              : Number(row.team_size ?? 1);
          const soloCount = row.tournament_registrations?.[0]?.count ?? 0;
          const teamCount = row.tournament_team_registrations?.[0]?.count ?? 0;
          const rest = { ...row };
          delete rest.tournament_registrations;
          delete rest.tournament_team_registrations;
          setTournament({
            ...rest,
            registration_count: teamSize > 1 ? teamCount : soloCount,
          });
        }
      } catch {
        // Fetch failed (network, missing env, RLS) — show the Invasion teaser.
        if (!cancelled) setTournament(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;

  return tournament ? (
    <FeaturedTournamentBanner t={tournament} />
  ) : (
    <InvasionFallbackBanner />
  );
}

function BannerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-surface-alt p-6 md:p-8 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.12)]">
      <div
        className="absolute inset-0 bg-gradient-to-r from-gold/10 via-gold/[0.03] to-transparent pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {children}
      </div>
    </div>
  );
}

function FeaturedTournamentBanner({ t }: { t: TournamentWithCount }) {
  const pool = estimatePrizePool(t);
  const isTeamEvent = (t.team_size ?? 1) > 1;

  return (
    <BannerShell>
      {/* Left — event details */}
      <div className="min-w-0">
        <Badge color="gold">
          <Trophy size={10} className="mr-1.5" />
          Featured Event
        </Badge>
        <h2 className="mt-3 font-heading text-xl md:text-2xl font-bold text-text truncate">
          {t.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
          <span>{t.game}</span>
          <span aria-hidden>&middot;</span>
          <span>{isTeamEvent ? "Team" : "Solo"}</span>
          <span aria-hidden>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} />
            {formatTournamentDate(t.date)} &middot; {formatTournamentTime(t.time)}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-gold">
          {pool.amount > 0
            ? `${formatPrice(pool.amount)} prize pool${pool.isEstimate ? " (est.)" : ""}`
            : t.prize}
        </p>
      </div>

      {/* Right — register CTA + slots */}
      <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
        <Link
          href={`/esports/${t.id}`}
          className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)] px-8 py-3.5 text-[15px] w-full md:w-auto"
        >
          Register
          <ArrowRight size={16} />
        </Link>
        <span className="inline-flex items-center justify-center md:justify-end gap-1.5 text-[11px] text-text-muted">
          <Users size={12} />
          {getFilledCount(t)}/{t.slots} slots filled
        </span>
      </div>
    </BannerShell>
  );
}

function InvasionFallbackBanner() {
  return (
    <BannerShell>
      {/* Left — brand teaser */}
      <div className="min-w-0">
        <Badge color="gold">
          <Trophy size={10} className="mr-1.5" />
          Invasion Tournament
        </Badge>
        <h2 className="mt-3 font-heading text-xl md:text-2xl font-bold text-text">
          Nigeria&apos;s Premier Esports Stage &mdash; the next edition is
          loading&hellip;
        </h2>
      </div>

      {/* Right — follow CTA */}
      <div className="shrink-0">
        <a
          href="https://www.instagram.com/invasiontournament"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-transparent text-cyan border border-cyan/40 hover:bg-cyan/5 px-6 py-2.5 text-[13px] w-full md:w-auto"
        >
          Follow @invasiontournament
          <ArrowRight size={14} />
        </a>
      </div>
    </BannerShell>
  );
}
