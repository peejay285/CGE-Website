"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Clock, Users, Flame, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface TournamentPreview {
  id: number;
  title: string;
  game: string;
  date: string;
  status: string;
  filled: number;
  slots: number;
  entry_fee: number;
}

export function LiveTournamentsWidget() {
  const [tournaments, setTournaments] = useState<TournamentPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("tournaments")
      .select("id, title, game, date, status, filled, slots, entry_fee")
      .in("status", ["open", "in_progress"])
      .order("date", { ascending: true })
      .limit(3)
      .then(({ data }: { data: TournamentPreview[] | null }) => {
        if (cancelled) return;
        setTournaments(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-magenta" />
          <h3 className="font-heading text-xs tracking-wide text-text">Tournaments</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={14} className="animate-spin text-text-muted" />
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-magenta" />
          <h3 className="font-heading text-xs tracking-wide text-text">Live Tournaments</h3>
        </div>
        <Link
          href="/esports"
          className="text-[10px] text-cyan hover:text-cyan/80 transition-colors flex items-center gap-0.5"
        >
          View all <ChevronRight size={10} />
        </Link>
      </div>

      <div className="space-y-2">
        {tournaments.map((t) => {
          const isLive = t.status === "in_progress";
          const isFull = t.filled >= t.slots;
          const fillPercent = Math.round((t.filled / t.slots) * 100);

          return (
            <Link
              key={t.id}
              href="/esports"
              className="block rounded-lg bg-surface-alt border border-border p-2.5 hover:border-magenta/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-[11px] font-semibold text-text truncate group-hover:text-magenta transition-colors">
                  {t.title}
                </p>
                {isLive && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-bold text-magenta bg-magenta/10 border border-magenta/20 rounded-md px-1.5 py-0.5 uppercase">
                    <Flame size={7} />
                    Live
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[9px] text-text-muted mb-1.5">
                <span>{t.game}</span>
                <span className="text-border">&middot;</span>
                <span className="flex items-center gap-0.5">
                  <Users size={8} />
                  {t.filled}/{t.slots}
                </span>
                {t.entry_fee > 0 && (
                  <>
                    <span className="text-border">&middot;</span>
                    <span className="text-cyan">₦{t.entry_fee.toLocaleString()}</span>
                  </>
                )}
              </div>
              {/* Fill bar */}
              <div className="h-1 rounded-full bg-surface overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isFull ? "bg-magenta/60" : "bg-magenta/40"
                  )}
                  style={{ width: `${Math.min(fillPercent, 100)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
