"use client";

import { Button } from "@/components/ui/button";

/**
 * CTA for the /beta pitch page. Opens the global auth modal (rendered by
 * AppShell on every page) via the established "open-auth-modal" event —
 * the same mechanism the rest of the app uses.
 */
export function JoinBetaCta() {
  return (
    <Button
      size="lg"
      onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
    >
      Create your account
    </Button>
  );
}
