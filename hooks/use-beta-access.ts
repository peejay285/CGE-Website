"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isBetaGateActive } from "@/lib/site-config";

// Session-lifetime cache so repeated mounts (page navigations, multiple
// gated surfaces on one page) don't refetch the same approval flag.
const approvalCache = new Map<string, boolean>();

/**
 * Closed-beta access check for the signed-in user.
 *
 * Returns `approved: true` when the gate is inactive (site phase is not
 * "beta") or there is no user — unauthenticated visitors hit the auth
 * modal before any gated action, so the gate only concerns signed-in,
 * unapproved accounts. Otherwise reads profiles.beta_approved once per
 * user and caches it.
 */
export function useBetaAccess(userId: string | undefined | null) {
  const gateActive = isBetaGateActive();
  const inactive = !gateActive || !userId;
  const cached = userId ? approvalCache.get(userId) : undefined;
  // The cache is the source of truth; this tick only forces a re-render when
  // the async lookup lands. `approved`/`loading` are derived during render,
  // so the effect never has to set state synchronously.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (inactive || !userId) return;
    if (approvalCache.get(userId) !== undefined) return;

    let cancelled = false;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("beta_approved")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: { data: { beta_approved: boolean | null } | null }) => {
        if (cancelled) return;
        // Fail open on missing rows/fetch errors — this is a courtesy
        // gate, and a hiccup shouldn't lock approved testers out.
        const value = data ? Boolean(data.beta_approved) : true;
        approvalCache.set(userId, value);
        setTick((n) => n + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [inactive, userId]);

  return {
    approved: inactive ? true : cached ?? false,
    loading: !inactive && cached === undefined,
  };
}
