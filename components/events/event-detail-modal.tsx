"use client";

import { Calendar, Clock, MapPin, Users, Ticket, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { Event } from "@/lib/types";

interface EventDetailModalProps {
  event: (Event & { registration_count?: number }) | null;
  open: boolean;
  onClose: () => void;
  onRegister?: (eventId: number) => void;
  onUnregister?: (eventId: number) => void;
  registerLoading?: boolean;
  isRegistered?: boolean;
  isPast?: boolean;
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

export function EventDetailModal({ event, open, onClose, onRegister, onUnregister, registerLoading, isRegistered, isPast }: EventDetailModalProps) {
  if (!event) return null;

  const isFull = event.capacity != null && (event.registration_count ?? 0) >= event.capacity;
  const eventLocation = event.location;

  return (
    <Modal open={open} onClose={onClose} width="lg">
      {/* Emoji header */}
      <div className="flex flex-col items-center text-center mb-6">
        <span className="text-6xl mb-4">{typeEmoji[event.type]}</span>
        <Badge color={typeBadgeColor[event.type]} size="md" className="mb-3">
          {event.type}
        </Badge>
        <h2 className="text-xl md:text-2xl font-bold font-heading tracking-tight text-text">
          {event.title}
        </h2>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-3">
          <Calendar size={16} className="text-cyan shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Date</p>
            <p className="text-sm font-medium text-text">{event.date}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-3">
          <Clock size={16} className="text-cyan shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Time</p>
            <p className="text-sm font-medium text-text">{event.time}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-3">
          <MapPin size={16} className="text-magenta shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Location</p>
            <p className="text-sm font-medium text-text">{eventLocation || "CGE Gaming Lounge, Bonny Island"}</p>
          </div>
        </div>

        {event.capacity && (
          <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-3">
            <Users size={16} className="text-cyan shrink-0" />
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
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-2">About</p>
          <p className="text-sm text-text-muted leading-relaxed">{event.description}</p>
        </div>
      )}

      {/* Price & Register */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Ticket size={16} className="text-cyan" />
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
              onClick={() => onUnregister?.(event.id)}
              disabled={registerLoading}
              className="text-[11px] text-text-muted hover:text-magenta transition-colors cursor-pointer"
            >
              {registerLoading ? "Cancelling..." : "Cancel registration"}
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={() => onRegister?.(event.id)}
            disabled={registerLoading}
          >
            {registerLoading ? (
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
    </Modal>
  );
}
