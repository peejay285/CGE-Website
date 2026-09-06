"use client";

import Link from "next/link";
import { Clock, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useBetaAccess } from "@/hooks/use-beta-access";
import { BRAND } from "@/lib/constants";

/**
 * State-aware CTA for the /beta pitch page.
 *
 * Signed out        → "Create your account" (opens the global auth modal).
 * Signed in, waiting → status card: you're in line, we'll reach out.
 * Approved           → celebration + jump straight into the product.
 *
 * Previously this always showed "Create your account", even to users
 * who already had — approval was only discoverable by retrying a
 * blocked action somewhere else.
 */
export function JoinBetaCta() {
  const { user, loading: authLoading } = useAuth();
  const { approved, loading: betaLoading } = useBetaAccess(user?.id);

  if (authLoading || (user && betaLoading)) {
    return (
      <div className="h-12 w-48 mx-auto rounded-lg bg-surface-alt border border-border animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Button
        size="lg"
        onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
      >
        Create your account
      </Button>
    );
  }

  if (!approved) {
    return (
      <div className="mx-auto max-w-sm rounded-xl border border-gold/30 bg-gold/5 p-5 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-gold">
          <Clock size={15} />
          You&apos;re in line for the beta
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          Your account is registered and waiting for the next wave. We
          approve testers in small batches and reach out on WhatsApp —
          you can also check back here any time.
        </p>
        <a
          href={BRAND.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-border bg-surface-alt px-4 py-2 text-xs font-semibold text-text transition-colors hover:border-green/40 hover:text-green"
        >
          Message us on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-green/30 bg-green/5 p-5 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-green">
        <PartyPopper size={15} />
        You&apos;re approved — welcome to the beta!
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Everything is unlocked: book a station, enter a tournament, list
        a swap, join the conversation.
      </p>
      <Link
        href="/lounge"
        className="mt-3 inline-flex items-center justify-center rounded-lg bg-cyan px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-base transition-colors hover:bg-[#33F3FF]"
      >
        Start exploring
      </Link>
    </div>
  );
}
