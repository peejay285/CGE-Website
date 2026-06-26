import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatBookingDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr + "T00:00:00");
  return date.getDay() === 0;
}

/**
 * Escape special characters for PostgREST LIKE/ILIKE filters.
 * Prevents user input from being interpreted as wildcards or operators.
 */
export function escapePostgrestSearch(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*");
}

/**
 * Sanitize a user-supplied URL for safe use in href attributes.
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 * Returns "#" for invalid URLs.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return trimmed;
    }
    return "#";
  } catch {
    // Relative URLs or malformed — block if they look like a protocol attack
    if (/^[a-z]+:/i.test(trimmed)) return "#";
    return trimmed;
  }
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return past.toLocaleDateString();
}

/** Parse a slot label like "10:00 AM" / "1:00 PM" into a 24h hour. */
export function slotToHour(slot: string): number {
  const match = slot.trim().match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/i);
  if (!match) return -1;
  let hour = Number(match[1]) % 12;
  if (match[2].toUpperCase() === "PM") hour += 12;
  return hour;
}
