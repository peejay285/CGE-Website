"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";

interface EventWithCount extends Event {
  registration_count: number;
}

interface EventRegistration {
  id: string;
  event_id: number;
  user_id: string;
  registered_at: string;
}

export function useEvents(initialType?: string) {
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  const getEvents = useCallback(
    async (type?: string) => {
      try {
        setLoading(true);
        setError(null);

        const filterType = type ?? initialType;

        let query = supabase
          .from("events")
          .select("*, event_registrations(count)")
          .order("date", { ascending: true });

        if (filterType) {
          query = query.eq("type", filterType);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const mapped = (data ?? []).map((item: Record<string, unknown>) => {
          const regData = item.event_registrations as
            | Array<{ count: number }>
            | undefined;
          const registrationCount = regData?.[0]?.count ?? 0;
          const { event_registrations: _, ...rest } = item;
          return {
            ...rest,
            registration_count: registrationCount,
          } as EventWithCount;
        });

        setEvents(mapped);
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch events";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase, initialType]
  );

  useEffect(() => {
    getEvents();
  }, [getEvents]);

  const getEventById = useCallback(
    async (id: number): Promise<EventWithCount | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data, error: fetchError } = await supabase
          .from("events")
          .select("*, event_registrations(count)")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const regData = data.event_registrations as
          | Array<{ count: number }>
          | undefined;
        const registrationCount = regData?.[0]?.count ?? 0;
        const { event_registrations: _, ...rest } = data;

        return {
          ...rest,
          registration_count: registrationCount,
        } as EventWithCount;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch event";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const registerForEvent = useCallback(
    async (event_id: number): Promise<EventRegistration | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: insertError } = await supabase
          .from("event_registrations")
          .insert({
            event_id,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const registration = data as EventRegistration;
        setRegistrations((prev) => [registration, ...prev]);

        // Update local event registration count
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event_id
              ? { ...e, registration_count: e.registration_count + 1 }
              : e
          )
        );

        return registration;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to register for event";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const unregisterFromEvent = useCallback(
    async (event_id: number): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("event_registrations")
          .delete()
          .eq("event_id", event_id)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        setRegistrations((prev) => prev.filter((r) => r.event_id !== event_id));
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event_id
              ? { ...e, registration_count: Math.max(0, e.registration_count - 1) }
              : e
          )
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to unregister";
        setActionError(message);
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getUserEventRegistrations = useCallback(async () => {
    try {
      setActionLoading(true);
      setActionError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error: fetchError } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("registered_at", { ascending: false });

      if (fetchError) throw fetchError;

      const regs = data as EventRegistration[];
      setRegistrations(regs);
      return regs;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch event registrations";
      setActionError(message);
      return [];
    } finally {
      setActionLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    getUserEventRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRegisteredForEvent = useCallback(
    (event_id: number): boolean => {
      return registrations.some((r) => r.event_id === event_id);
    },
    [registrations]
  );

  const searchEvents = useCallback(
    (searchString: string): EventWithCount[] => {
      return events.filter((e) =>
        e.title.toLowerCase().includes(searchString.toLowerCase())
      );
    },
    [events]
  );

  return {
    events,
    registrations,
    loading,
    error,
    actionLoading,
    actionError,
    getEvents,
    getEventById,
    registerForEvent,
    unregisterFromEvent,
    isRegisteredForEvent,
    searchEvents,
    getUserEventRegistrations,
  };
}
