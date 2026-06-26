/**
 * Centralized pricing logic for the CGE Lounge.
 *
 * Single source of truth — every component that needs a price
 * calls into this module instead of computing it locally.
 */

import { PRICING } from "@/lib/constants";

/* ─── Session pricing ─────────────────────────────────────── */

/**
 * Resolves the per-unit price for a given zone + game selection.
 *
 * Zone-specific rules:
 *  • main  – FC 26 has its own rate; everything else falls to "Other Games"
 *  • vip   – Private PS5 room, priced per hour regardless of game.
 *  • vr    – Flat rate regardless of game.
 */
export function getUnitPrice(zone: string, game: string): number {
  switch (zone) {
    case "main": {
      // Try exact match first (e.g. "FC 26")
      const match = PRICING.mainLounge.find((p) => p.game === game);
      if (match) return match.price;
      // Fallback → "Other Games" rate
      const other = PRICING.mainLounge.find((p) => p.game === "Other Games");
      return other?.price ?? 2000;
    }

    case "vip": {
      const match = PRICING.vipLounge.find((p) => p.game === "Private PS5 Room");
      return match?.price ?? 5000;
    }

    case "vr": {
      const match = PRICING.vr[0];
      return match?.price ?? 2000;
    }

    default:
      return 0;
  }
}

/**
 * Calculates the total session cost for a given unit price × duration.
 */
export function getSessionTotal(unitPrice: number, duration: number): number {
  return unitPrice * duration;
}

/* ─── Extras pricing ──────────────────────────────────────── */

const ALL_EXTRAS = [...PRICING.drinks, ...PRICING.snacks] as const;

/**
 * Calculates the total cost of selected drinks / snacks.
 *
 * @param selections – Record mapping item name → quantity
 */
export function getDrinksTotal(selections: Record<string, number>): number {
  return Object.entries(selections).reduce((sum, [name, qty]) => {
    const item = ALL_EXTRAS.find((i) => i.name === name);
    return sum + qty * (item?.price ?? 0);
  }, 0);
}

/* ─── Composite helpers ───────────────────────────────────── */

/**
 * Full booking cost breakdown.
 */
export function getBookingTotals(
  zone: string,
  game: string,
  duration: number,
  drinks: Record<string, number>
) {
  const unitPrice = getUnitPrice(zone, game);
  const sessionTotal = getSessionTotal(unitPrice, duration);
  const drinksTotal = getDrinksTotal(drinks);

  return {
    unitPrice,
    sessionTotal,
    drinksTotal,
    total: sessionTotal + drinksTotal,
  };
}
