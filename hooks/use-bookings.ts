"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { slotToHour } from "@/lib/utils";
import type { Booking } from "@/lib/types";

interface CreateBookingData {
  zone_id: string;
  game_name: string;
  booking_date: string;
  time_slot: string;
  duration: number;
  drinks: Record<string, number>;
  /**
   * Client-supplied totals are no longer trusted. They are kept on the
   * type for backwards-compat with existing callers but ignored — the
   * server recomputes totals from authoritative pricing.
   */
  session_total?: number;
  drinks_total?: number;
  total?: number;
  payment_method: "paystack" | "venue";
  /** Optional CGE voucher code — validated, claimed and applied server-side. */
  voucher_code?: string;
}

interface AvailabilityResult {
  available: boolean;
  remaining_slots: number;
  total_capacity: number;
  booked_count: number;
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  const getUserBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setBookings(data as Booking[]);
      return data as Booking[];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch bookings";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    getUserBookings();
  }, [getUserBookings]);

  const createBooking = useCallback(
    async (bookingData: CreateBookingData): Promise<Booking | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        // The server is now the only path that can create a booking — it
        // recomputes totals server-side from authoritative pricing, so a
        // tampered client total cannot result in a free session. RLS blocks
        // direct from("bookings").insert() from the browser.
        const res = await fetch("/api/bookings/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone_id: bookingData.zone_id,
            game_name: bookingData.game_name,
            booking_date: bookingData.booking_date,
            time_slot: bookingData.time_slot,
            duration: bookingData.duration,
            drinks: bookingData.drinks,
            payment_method: bookingData.payment_method,
            ...(bookingData.voucher_code
              ? { voucher_code: bookingData.voucher_code }
              : {}),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Server returned ${res.status}`);
        }

        const { booking } = (await res.json()) as { booking: Booking };
        setBookings((prev) => [booking, ...prev]);
        return booking;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create booking";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const cancelBooking = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { error: updateError } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", id);

        if (updateError) throw updateError;

        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: "cancelled" as const } : b))
        );
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cancel booking";
        setActionError(message);
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const checkAvailability = useCallback(
    async (
      zone_id: string,
      date: string,
      time_slot: string,
      duration: number = 1
    ): Promise<AvailabilityResult | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        // Aggregate per-hour counts via SECURITY DEFINER RPC — sees ALL
        // bookings (client-side counts only saw the caller's own under
        // RLS) and accounts for multi-hour bookings.
        const { data: rows, error: rpcError } = await supabase.rpc(
          "get_slot_availability",
          { p_zone_id: zone_id, p_booking_date: date }
        );
        if (rpcError) throw rpcError;

        const byHour = new Map<number, { booked: number; capacity: number }>();
        for (const r of (rows ?? []) as {
          slot_hour: number;
          booked_count: number;
          capacity: number;
        }[]) {
          byHour.set(r.slot_hour, {
            booked: Number(r.booked_count),
            capacity: r.capacity,
          });
        }

        const start = slotToHour(time_slot);
        const span = zone_id === "vr" ? 1 : Math.max(duration, 1);
        let totalCapacity = byHour.values().next().value?.capacity ?? 1;
        let worstBooked = 0;
        for (let h = start; h < start + span; h++) {
          const info = byHour.get(h);
          if (!info) continue;
          totalCapacity = info.capacity;
          if (info.booked > worstBooked) worstBooked = info.booked;
        }

        const remainingSlots = totalCapacity - worstBooked;

        return {
          available: remainingSlots > 0,
          remaining_slots: Math.max(0, remainingSlots),
          total_capacity: totalCapacity,
          booked_count: worstBooked,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check availability";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  return {
    bookings,
    loading,
    error,
    actionLoading,
    actionError,
    createBooking,
    getUserBookings,
    cancelBooking,
    checkAvailability,
  };
}
