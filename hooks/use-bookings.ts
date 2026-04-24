"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking, Zone } from "@/lib/types";

interface CreateBookingData {
  zone_id: string;
  game_name: string;
  booking_date: string;
  time_slot: string;
  duration: number;
  drinks: Record<string, number>;
  session_total: number;
  drinks_total: number;
  total: number;
  payment_method: "paystack" | "venue";
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

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: insertError } = await supabase
          .from("bookings")
          .insert({
            ...bookingData,
            user_id: user.id,
            status: "confirmed",
            payment_status: "pending",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const booking = data as Booking;
        setBookings((prev) => [booking, ...prev]);

        // Auto-enter signed-in user into monthly giveaway
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        await supabase.from("giveaway_entries").insert({
          user_id: user.id,
          booking_id: booking.id,
          month,
        });

        return booking;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create booking";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
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
      time_slot: string
    ): Promise<AvailabilityResult | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        // Get the zone capacity
        const { data: zoneData, error: zoneError } = await supabase
          .from("zones")
          .select("capacity")
          .eq("id", zone_id)
          .single();

        if (zoneError) throw zoneError;
        const zone = zoneData as Pick<Zone, "capacity">;

        // Count existing bookings for that slot (exclude cancelled)
        const { count, error: countError } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("zone_id", zone_id)
          .eq("booking_date", date)
          .eq("time_slot", time_slot)
          .neq("status", "cancelled");

        if (countError) throw countError;

        const bookedCount = count ?? 0;
        const totalCapacity = zone.capacity;
        const remainingSlots = totalCapacity - bookedCount;

        return {
          available: remainingSlots > 0,
          remaining_slots: Math.max(0, remainingSlots),
          total_capacity: totalCapacity,
          booked_count: bookedCount,
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
