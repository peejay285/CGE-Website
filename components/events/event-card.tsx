"use client";

import { Calendar, Clock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import type { Event } from "@/lib/types";

interface EventCardProps {
  event: Event & { registration_count?: number };
  onClick: () => void;
  isPast?: boolean;
  isRegistered?: boolean;
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

export function EventCard({ event, onClick, isPast, isRegistered }: EventCardProps) {
  const isFull = event.capacity != null && (event.registration_count ?? 0) >= event.capacity;

  return (
    <Card onClick={onClick} className={cn("group overflow-hidden", isPast && "opacity-60")}>
      {/* Emoji header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl">{typeEmoji[event.type]}</span>
        <div className="flex flex-col items-end gap-1.5">
          <Badge color={typeBadgeColor[event.type]}>{event.type}</Badge>
          {isPast && <Badge color="gold">Past</Badge>}
          {isRegistered && !isPast && <Badge color="cyan">Registered</Badge>}
          {isFull && !isPast && !isRegistered && <Badge color="magenta">Full</Badge>}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold font-heading tracking-tight text-text mb-2 group-hover:text-cyan transition-colors">
        {event.title}
      </h3>

      {/* Date & Time */}
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Calendar size={13} className="text-cyan/60" />
          <span>{event.date}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Clock size={13} className="text-cyan/60" />
          <span>{event.time}</span>
        </div>
        {event.capacity && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Users size={13} className="text-cyan/60" />
            <span>
              {event.registration_count !== undefined
                ? `${event.registration_count} / ${event.capacity} spots`
                : `${event.capacity} spots`}
            </span>
          </div>
        )}
      </div>

      {/* Description (truncated) */}
      {event.description && (
        <p className="text-xs text-text-muted leading-relaxed mb-4 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Price */}
      <div className="pt-3 border-t border-border">
        {event.is_free ? (
          <Badge color="green" size="md">Free</Badge>
        ) : event.price ? (
          <span className="text-sm font-bold font-heading text-magenta">
            {formatPrice(event.price)}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
