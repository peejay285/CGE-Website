import type { Tournament } from "@/lib/types";

// ── Shared tournament types ──────────────────────────

export interface TournamentWithCount extends Tournament {
  registration_count: number;
}

// ── Game emoji mapping ───────────────────────────────

export const GAME_EMOJI: Record<string, string> = {
  "FC 26": "\u26BD",
  "Tekken 8": "\uD83E\uDD4A",
  "Call of Duty": "\uD83C\uDFAF",
  "MK1": "\uD83D\uDC32",
  "NBA 2K": "\uD83C\uDFC0",
  "GTA": "\uD83D\uDE97",
  "Spider-Man": "\uD83D\uDD78\uFE0F",
  "God of War": "\u2694\uFE0F",
};

export function getGameEmoji(game: string): string {
  return GAME_EMOJI[game] || "\uD83C\uDFAE";
}

// ── Status badge config ──────────────────────────────

export const STATUS_CONFIG: Record<
  Tournament["status"],
  { color: "green" | "red" | "cyan" | "gold"; label: string }
> = {
  open: { color: "green", label: "Open" },
  full: { color: "red", label: "Full" },
  in_progress: { color: "cyan", label: "Live" },
  completed: { color: "gold", label: "Completed" },
  cancelled: { color: "red", label: "Cancelled" },
};

// ── Countdown helper ─────────────────────────────────

export function getCountdown(dateStr: string, timeStr: string): string | null {
  const dateTime = new Date(`${dateStr} ${timeStr}`);
  if (isNaN(dateTime.getTime())) return null;
  const now = new Date();
  const diff = dateTime.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ── Past-tournament check ────────────────────────────

export function isTournamentPast(dateStr: string, status?: string): boolean {
  if (status === "completed") return true;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

// ── Prize payout distribution helpers ───────────────
// Mirrors the DB default on tournaments.payout_distribution
// (see supabase/tournament-prize-payouts-migration.sql).

export type PayoutDistributionEntry = {
  place: number;
  label?: string;
  percent: number;
};

export const DEFAULT_PAYOUT_DISTRIBUTION: PayoutDistributionEntry[] = [
  { place: 1, label: "1st Place", percent: 60 },
  { place: 2, label: "2nd Place", percent: 25 },
  { place: 3, label: "3rd Place", percent: 15 },
];

/** "1st", "2nd", "3rd", "4th", ... */
export function formatPlacement(place: number): string {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}

/**
 * Sanitized payout distribution for a tournament, falling back to the
 * platform default (60/25/15) when the jsonb is missing or malformed.
 */
export function getPayoutDistribution(
  tournament: Pick<Tournament, "payout_distribution">
): PayoutDistributionEntry[] {
  const raw = tournament.payout_distribution;
  if (!Array.isArray(raw)) return DEFAULT_PAYOUT_DISTRIBUTION;
  const valid = raw
    .filter(
      (item) =>
        item &&
        Number.isFinite(Number(item.place)) &&
        Number(item.place) >= 1 &&
        Number(item.percent) > 0
    )
    .map((item) => ({
      place: Number(item.place),
      label: item.label,
      percent: Number(item.percent),
    }))
    .sort((a, b) => a.place - b.place);
  return valid.length > 0 ? valid : DEFAULT_PAYOUT_DISTRIBUTION;
}

/**
 * Best-known prize pool in naira. Uses the locked pool once payouts have
 * been prepared; before that the pool grows with paid entries, so we
 * estimate from entry fee × current registrations.
 */
export function estimatePrizePool(
  tournament: Tournament & { registration_count?: number }
): { amount: number; isEstimate: boolean } {
  if (tournament.prize_pool_total && tournament.prize_pool_total > 0) {
    return { amount: tournament.prize_pool_total, isEstimate: false };
  }
  if (tournament.entry_fee > 0) {
    return {
      amount: tournament.entry_fee * getFilledCount(tournament),
      isEstimate: true,
    };
  }
  return { amount: 0, isEstimate: true };
}

/** Gross naira amount for one placement — same floor math as the payout RPC. */
export function placementAmount(pool: number, percent: number): number {
  return Math.floor((pool * percent) / 100);
}

// ── Default rules fallback ───────────────────────────

export const DEFAULT_TOURNAMENT_RULES = [
  "No-shows forfeit the match",
  "Score disputes must be raised within 5 minutes",
  "Admin decisions are final",
  "All participants must be present 15 minutes before start",
];

// ── Filled count helper (prefers registration_count) ─

export function getFilledCount(
  tournament: Tournament & { registration_count?: number }
): number {
  return tournament.registration_count ?? tournament.filled;
}

// ── Human-friendly date formatting ───────────────────

export function formatTournamentDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTournamentTime(timeStr: string): string {
  // timeStr is "HH:MM" — convert to 12h
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}
