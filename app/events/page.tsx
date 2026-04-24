"use client";

import { useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/ui/section-title";
import { TabBar } from "@/components/ui/tab-bar";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/events/event-card";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { EventCalendar } from "@/components/events/event-calendar";
import { useEvents } from "@/hooks/use-events";
import { useAuth } from "@/hooks/use-auth";
import type { Event } from "@/lib/types";

const TABS = ["List", "Calendar"];
const EVENT_TYPES = ["All", "Party", "Special", "Demo", "Package"] as const;

function isEventPast(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

const typeChipColor: Record<string, string> = {
  All: "bg-cyan/15 text-cyan",
  Party: "bg-magenta/15 text-magenta",
  Special: "bg-gold/15 text-gold",
  Demo: "bg-cyan/15 text-cyan",
  Package: "bg-green/15 text-green",
};

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState("List");
  const [selectedEvent, setSelectedEvent] = useState<(Event & { registration_count?: number }) | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();
  const {
    events,
    loading,
    registerForEvent,
    unregisterFromEvent,
    isRegisteredForEvent,
    actionLoading,
    getEventById,
  } = useEvents();

  // Filter events by type and search
  const filteredEvents = useMemo(() => {
    let result = events;

    if (typeFilter !== "All") {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [events, typeFilter, searchQuery]);

  // Split into upcoming and past
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: typeof filteredEvents = [];
    const past: typeof filteredEvents = [];

    filteredEvents.forEach((event) => {
      if (isEventPast(event.date)) {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [filteredEvents]);

  const openEvent = (event: Event) => {
    setSelectedEvent(event as Event & { registration_count?: number });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  const handleRegister = useCallback(
    async (eventId: number) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to register for events", { icon: "\uD83D\uDD12" });
        return;
      }

      const registration = await registerForEvent(eventId);
      if (registration) {
        toast.success("Successfully registered for the event!");
        // Refresh modal event data
        const updated = await getEventById(eventId);
        if (updated) setSelectedEvent(updated);
      } else {
        toast.error("Failed to register. You may already be registered.");
      }
    },
    [user, registerForEvent, getEventById]
  );

  const handleUnregister = useCallback(
    async (eventId: number) => {
      const success = await unregisterFromEvent(eventId);
      if (success) {
        toast.success("Registration cancelled");
        const updated = await getEventById(eventId);
        if (updated) setSelectedEvent(updated);
      } else {
        toast.error("Failed to cancel registration");
      }
    },
    [unregisterFromEvent, getEventById]
  );

  const selectedIsPast = selectedEvent ? isEventPast(selectedEvent.date) : false;
  const selectedIsRegistered = selectedEvent ? isRegisteredForEvent(selectedEvent.id) : false;

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-6xl mx-auto">
      <SectionTitle
        eyebrow="What's On"
        title="Events & Happenings"
        subtitle="Stay updated with the latest events, parties, and special nights at CGE gaming lounge."
      />

      {/* Search + Tabs row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* Search bar */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-surface-alt text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-cyan/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tab bar */}
        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer border",
              typeFilter === type
                ? cn(typeChipColor[type], "border-transparent")
                : "text-text-muted border-border hover:border-text-muted/30 hover:text-text"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon="📅"
          title={searchQuery ? "No matching events" : "No events yet"}
          subtitle={
            searchQuery
              ? "Try a different search term or clear the filter."
              : "Check back soon for upcoming events and happenings at CGE."
          }
        />
      ) : (
        <>
          {/* List view */}
          {activeTab === "List" && (
            <div className="space-y-10">
              {/* Upcoming events */}
              {upcomingEvents.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-cyan mb-4">
                    Upcoming
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {upcomingEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => openEvent(event)}
                        isRegistered={isRegisteredForEvent(event.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Past events */}
              {pastEvents.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-text-muted mb-4">
                    Past Events
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {pastEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => openEvent(event)}
                        isPast
                        isRegistered={isRegisteredForEvent(event.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Edge case: only past events, no upcoming */}
              {upcomingEvents.length === 0 && pastEvents.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-alt p-4 text-center mb-6 order-first">
                  <p className="text-sm text-text-muted">
                    No upcoming events right now. Check back soon!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Calendar view */}
          {activeTab === "Calendar" && (
            <EventCalendar events={filteredEvents} onEventSelect={openEvent} />
          )}
        </>
      )}

      {/* Detail modal */}
      <EventDetailModal
        event={selectedEvent}
        open={modalOpen}
        onClose={closeModal}
        onRegister={handleRegister}
        onUnregister={handleUnregister}
        registerLoading={actionLoading}
        isRegistered={selectedIsRegistered}
        isPast={selectedIsPast}
      />
    </div>
  );
}
