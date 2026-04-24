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
