"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * Live "open now / closed" chip for the lounge, computed on the device
 * from the venue's Lagos hours (Mon–Sat 10:00–21:00, Sun 13:00–21:00).
 *
 * useSyncExternalStore with an empty server snapshot: the server renders
 * a neutral placeholder, the client fills in the real status after
 * hydration, and the two never disagree (no hydration mismatch, no
 * setState-in-effect).
 */

const LAGOS_OFFSET_MIN = 60; // UTC+1, no DST

function lagosNow() {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + LAGOS_OFFSET_MIN) * 60_000);
}

/** Snapshot as a primitive string so React can compare it cheaply. */
function getSnapshot(): string {
  const t = lagosNow();
  const day = t.getDay(); // 0 = Sunday
  const minutes = t.getHours() * 60 + t.getMinutes();
  const opens = day === 0 ? 13 * 60 : 10 * 60;
  const closes = 21 * 60;

  if (minutes >= opens && minutes < closes) return "open|Open now, until 9 PM";
  if (minutes < opens) return `closed|Opens ${day === 0 ? "1 PM" : "10 AM"} today`;
  return `closed|Opens ${day === 6 ? "1 PM" : "10 AM"} tomorrow`;
}

function getServerSnapshot(): string {
  return "";
}

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

export function LoungeStatus({ className }: { className?: string }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!snapshot) {
    return <span className={cn("inline-block h-4 w-32 rounded bg-white/5", className)} />;
  }

  const [state, label] = snapshot.split("|");
  const open = state === "open";

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          open ? "bg-green shadow-[0_0_10px_rgba(0,255,136,0.6)]" : "bg-text-muted/50"
        )}
      />
      <span className={open ? "text-green" : "text-text-muted"}>{label}</span>
    </span>
  );
}
