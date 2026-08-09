"use client";

import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/esports-utils";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Live-updating countdown label for a tournament start time
 * ("2d 4h", "2h 15m", "42m").
 *
 * Deliberately lightweight: ticks once per minute and only tightens to
 * once per second inside the final hour, then stops entirely once the
 * start time passes — one timer per subscribed component, no storms.
 */
export function useCountdown(
  dateStr: string,
  timeStr: string,
  enabled: boolean = true
): string | null {
  const [countdown, setCountdown] = useState<string | null>(() =>
    enabled ? getCountdown(dateStr, timeStr) : null
  );

  useEffect(() => {
    // Disabled: no timer to run. The stale state is masked by the derived
    // return below instead of a setState here (react-hooks/set-state-in-effect).
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      setCountdown(getCountdown(dateStr, timeStr));

      const target = new Date(`${dateStr} ${timeStr}`).getTime();
      if (isNaN(target)) return;

      const remaining = target - Date.now();
      if (remaining <= 0) return; // Started — stop ticking.

      timer = setTimeout(tick, remaining < HOUR_MS ? 1_000 : 60_000);
    };

    tick();
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [dateStr, timeStr, enabled]);

  // Derive the disabled case during render rather than resetting state in
  // the effect; when re-enabled the effect's first tick refreshes the value.
  return enabled ? countdown : null;
}
