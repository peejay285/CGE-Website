"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Footer } from "@/components/layout/footer";
import { AuthModal } from "@/components/auth/auth-modal";
import { AIConcierge } from "@/components/ai-concierge";
import { GiveawayBanner } from "@/components/giveaway-banner";
import { AppGateModal } from "@/components/ui/app-gate";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useAuth } from "@/hooks/use-auth";
import { useMessages } from "@/hooks/use-messages";

/** Only allow same-origin path redirects ("/messages" yes, "//evil.com" no). */
function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // Assume the tour is open until it reports otherwise — keeps the giveaway
  // banner from flashing underneath it on first paint.
  const [tourOpen, setTourOpen] = useState(true);
  const { user, signOut } = useAuth();
  const { unreadTotal, getUnreadCount, subscribeToUnread } = useMessages();
  // Where to resume navigation after a successful sign-in. Set by the
  // ?auth=required redirect from proxy.ts and by open-auth-modal events
  // that carry a `returnTo` detail.
  const returnToRef = useRef<string | null>(null);

  const openAuthModal = useCallback((event?: Event) => {
    const detail =
      event instanceof CustomEvent
        ? (event.detail as { returnTo?: string } | null)
        : null;
    const target = sanitizeReturnTo(detail?.returnTo);
    if (target) returnToRef.current = target;
    setAuthModalOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener("open-auth-modal", openAuthModal);
    return () => window.removeEventListener("open-auth-modal", openAuthModal);
  }, [openAuthModal]);

  // Signed-out visits to protected routes land on /?auth=required&returnTo=…
  // (see proxy.ts) — open the auth modal and remember where they were headed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "required") {
      returnToRef.current = sanitizeReturnTo(params.get("returnTo"));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read of the landing URL; it must happen post-mount (window) and cannot be derived during render without an SSR hydration mismatch
      setAuthModalOpen(true);
    }
  }, []);

  // Once the user signs in, resume the interrupted navigation.
  useEffect(() => {
    if (user && returnToRef.current) {
      const target = returnToRef.current;
      returnToRef.current = null;
      router.push(target);
    }
  }, [user, router]);

  // Global unread count subscription
  useEffect(() => {
    if (!user) return;
    getUnreadCount();
    const cleanup = subscribeToUnread();
    return cleanup;
  }, [user, getUnreadCount, subscribeToUnread]);

  return (
    <>
      <Navbar
        onAuthClick={() => setAuthModalOpen(true)}
        user={user}
        onLogout={signOut}
        unreadCount={unreadTotal}
      />
      {/* pb-16 on mobile for bottom nav clearance, lg:pb-0 on desktop */}
      <main id="main-content" className="min-h-screen pt-16 pb-16 lg:pb-0">
        {children}
      </main>
      <Footer />
      <MobileBottomNav
        user={user}
        onAuthClick={() => setAuthModalOpen(true)}
        unreadCount={unreadTotal}
      />
      <AIConcierge />
      {/* Suppress the giveaway banner while the onboarding tour is on screen */}
      {!tourOpen && <GiveawayBanner />}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <AppGateModal />
      <OnboardingTour isSignedIn={!!user} onOpenChange={setTourOpen} />
    </>
  );
}
