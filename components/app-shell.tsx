"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PillarStrip } from "@/components/layout/pillar-strip";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Footer } from "@/components/layout/footer";
import { AuthModal } from "@/components/auth/auth-modal";
import { WhatsAppFAB } from "@/components/whatsapp-fab";
import { AIConcierge } from "@/components/ai-concierge";
import { GiveawayBanner } from "@/components/giveaway-banner";
import { AppGateModal } from "@/components/ui/app-gate";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useAuth } from "@/hooks/use-auth";
import { useMessages } from "@/hooks/use-messages";

const PILLAR_PREFIXES = ["/esports", "/marketplace", "/community", "/lounge"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { unreadTotal, getUnreadCount, subscribeToUnread } = useMessages();
  const pathname = usePathname();
  const onPillar = PILLAR_PREFIXES.some((p) => pathname.startsWith(p));

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);

  useEffect(() => {
    window.addEventListener("open-auth-modal", openAuthModal);
    return () => window.removeEventListener("open-auth-modal", openAuthModal);
  }, [openAuthModal]);

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
      <PillarStrip />
      {/* pb-16 on mobile for bottom nav clearance, lg:pb-0 on desktop. */}
      {/* Extra pt when the pillar strip is visible (h-10). */}
      <main
        id="main-content"
        className={
          onPillar
            ? "min-h-screen pt-24 lg:pt-26 pb-16 lg:pb-0"
            : "min-h-screen pt-16 pb-16 lg:pb-0"
        }
      >
        {children}
      </main>
      <Footer />
      <MobileBottomNav
        user={user}
        onAuthClick={() => setAuthModalOpen(true)}
        unreadCount={unreadTotal}
      />
      <WhatsAppFAB />
      <AIConcierge />
      <GiveawayBanner />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <AppGateModal />
      <OnboardingTour isSignedIn={!!user} />
    </>
  );
}
