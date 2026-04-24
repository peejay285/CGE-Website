"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Ticket, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { useEvents } from "@/hooks/use-events";
import { useAuth } from "@/hooks/use-auth";
import type { Event } from "@/lib/types";

interface EventWithCount extends Event {
  registration_count: number;
}

const typeBadgeColor: Record<Event["type"], "magenta" | "gold" | "cyan" | "green"> = {
  Party: "magenta",
  Special: "gold",
  Demo: "cyan",
  Package: "green",
};

const typeEmoji: Record<Event["type"], string> = {
  Party: "\uD83C\uDF89",
  Special: "\uD83D\uDC9C",
  Demo: "\uD83E\uDD7D",
  Package: "\uD83C\uDF82",
};

function isEventPast(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const {
    getEventById,
    registerForEvent,
    unregisterFromEvent,
    isRegisteredForEvent,
    actionLoading,
  } = useEvents();

  const [event, setEvent] = useState<EventWithCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const eventId = Number(params.id);

  useEffect(() => {
    if (isNaN(eventId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function loadEvent() {
      setLoading(true);
      const result = await getEventById(eventId);
      if (result) {
        setEvent(result);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const isPast = event ? isEventPast(event.date) : false;
  const isRegistered = event ? isRegisteredForEvent(event.id) : false;
  const isFull = event?.capacity != null && (event.registration_count ?? 0) >= event.capacity;
  const eventLocation = event?.location;

  const handleRegister = useCallback(async () => {
    if (!event) return;
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      toast("Sign in to register for events", { icon: "\uD83D\uDD12" });
      return;
    }

    const registration = await registerForEvent(event.id);
    if (registration) {
      toast.success("Successfully registered!");
      // Refresh the event data
      const updated = await getEventById(event.id);
      if (updated) setEvent(updated);
    } else {
      toast.error("Failed to register. You may already be registered.");
    }
  }, [event, user, registerForEvent, getEventById]);

  const handleUnregister = useCallback(async () => {
    if (!event) return;
    const success = await unregisterFromEvent(event.id);
    if (success) {
      toast.success("Registration cancelled");
      const updated = await getEventById(event.id);
      if (updated) setEvent(updated);
    } else {
      toast.error("Failed to cancel registration");
    }
  }, [event, unregisterFromEvent, getEventById]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-2xl mx-auto">
        <CardSkeleton />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <span className="text-6xl mb-4 block">📅</span>
          <h2 className="text-xl font-bold font-heading text-text mb-2">Event not found</h2>
          <p className="text-sm text-text-muted mb-6">This event may have been removed or doesn't exist.</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-cyan transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Back to Events
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
        {/* Emoji header */}
        <div className="flex flex-col items-center text-center mb-8">
          <span className="text-7xl mb-4">{typeEmoji[event.type]}</span>
          <Badge color={typeBadgeColor[event.type]} size="md" className="mb-3">
            {event.type}
          </Badge>
          {isPast && (
            <Badge color="gold" size="md" className="mb-3">
              Past Event
            </Badge>
          )}
          <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-text">
            {event.title}
          </h1>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-4">
            <Calendar size={18} className="text-cyan shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Date</p>
              <p className="text-sm font-medium text-text">{event.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-4">
            <Clock size={18} className="text-cyan shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Time</p>
              <p className="text-sm font-medium text-text">{event.time}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-4">
            <MapPin size={18} className="text-magenta shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Location</p>
              <p className="text-sm font-medium text-text">
                {eventLocation || "CGE Gaming Lounge, Bonny Island"}
              </p>
            </div>
          </div>

          {event.capacity && (
            <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-4">
              <Users size={18} className="text-cyan shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Capacity</p>
                <p className="text-sm font-medium text-text">
                  {event.registration_count !== undefined
                    ? `${event.registration_count} / ${event.capacity} spots`
                    : `${event.capacity} spots`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-2">About</p>
            <p className="text-sm text-text-muted leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Price & Register */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-cyan" />
            {event.is_free ? (
              <Badge color="green" size="md">Free Entry</Badge>
            ) : event.price ? (
              <span className="text-lg font-bold font-heading text-magenta">
                {formatPrice(event.price)}
              </span>
            ) : null}
          </div>

          {isPast ? (
            <Badge color="gold" size="md">Event Passed</Badge>
          ) : isFull ? (
            <Badge color="magenta" size="md">Event Full</Badge>
          ) : isRegistered ? (
            <div className="flex flex-col items-end gap-1">
              <Button variant="primary" size="md" disabled>
                Registered ✓
              </Button>
              <button
                type="button"
                onClick={handleUnregister}
                disabled={actionLoading}
                className="text-[11px] text-text-muted hover:text-magenta transition-colors cursor-pointer"
              >
                {actionLoading ? "Cancelling..." : "Cancel registration"}
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleRegister}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
