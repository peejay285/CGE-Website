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
  const cached = userId ? approvalCache.get(userId) : undefined;
  const [approved, setApproved] = useState<boolean>(
    !gateActive || !userId ? true : cached ?? false
  );
  const [loading, setLoading] = useState<boolean>(
    gateActive && Boolean(userId) && cached === undefined
  );

  useEffect(() => {
    if (!gateActive || !userId) {
      setApproved(true);
      setLoading(false);
      return;
    }

    const known = approvalCache.get(userId);
    if (known !== undefined) {
      setApproved(known);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

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
        setApproved(value);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gateActive, userId]);

  return { approved, loading };
}
