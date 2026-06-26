import { z } from "zod";

// Paystack initialize. Amount is no longer accepted from the client —
// the server looks up the record by metadata.booking_id /
// registration_id and uses its server-stored total. See
// app/api/paystack/initialize/route.ts.
export const paystackInitializeSchema = z.object({
  type: z.enum(["booking", "tournament", "tournament_team", "event", "premium", "swap_assist"]),
  metadata: z.record(z.string(), z.unknown()),
  client: z.enum(["web", "mobile"]).optional().default("web"),
});

// Booking creation
export const createBookingSchema = z.object({
  zone_id: z.enum(["main", "vip", "vr"]),
  game_name: z.string().min(1),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_slot: z.string().min(1),
  duration: z.number().positive().int().max(8),
  drinks: z.record(z.string(), z.number().int().min(0)).optional().default({}),
  session_total: z.number().int().min(0),
  drinks_total: z.number().int().min(0),
  total: z.number().int().positive(),
  payment_method: z.enum(["paystack", "venue"]),
});

// Marketplace listing
export const createListingSchema = z.object({
  title: z.string().min(3).max(100),
  price: z.number().int().min(0),
  condition: z.enum(["New", "Used - Like New", "Used - Good", "Used - Fair"]),
  category: z.enum([
    "Controllers",
    "Games",
    "Accessories",
    "Furniture",
    "Consoles",
  ]),
  description: z.string().max(1000).optional(),
  listing_type: z.enum(["sell", "swap", "sell_or_swap"]).default("sell"),
  swap_for: z.string().max(200).optional().nullable(),
  swap_for_tags: z.array(z.string().max(50)).max(10).default([]),
  buyout_price: z.number().int().min(0).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  images: z.array(z.string().url()).max(6).default([]),
});

// Community post
export const createPostSchema = z.object({
  content: z.string().min(1).max(500).trim(),
});

// Comment
export const createCommentSchema = z.object({
  content: z.string().min(1).max(500).trim(),
  post_id: z.string().uuid(),
});

// Tournament creation
export const createTournamentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  game: z.string().min(1, "Game is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  time: z.string().min(1, "Time is required"),
  entry_fee: z.number().int().min(0, "Entry fee cannot be negative"),
  prize: z.string().min(1, "Prize is required").max(200),
  slots: z.number().int().min(2, "Minimum 2 slots").max(256, "Maximum 256 slots"),
  format: z.string().min(1, "Format is required"),
  platform: z.string().min(1, "Platform is required"),
  rules: z.string().max(2000).optional(),
});

// Tournament update
export const updateTournamentSchema = createTournamentSchema.partial().extend({
  status: z.enum(["open", "full", "in_progress", "completed", "cancelled"]).optional(),
});

// AI concierge
export const aiConciergeSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .optional()
    .default([]),
});
