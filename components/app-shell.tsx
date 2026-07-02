"use client";

import { useState, useEffect, useCallback } from "react";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // Assume the tour is open until it reports otherwise — keeps the giveaway
  // banner from flashing underneath it on first paint.
  const [tourOpen, setTourOpen] = useState(true);
  const { user, signOut } = useAuth();
  const { unreadTotal, getUnreadCount, subscribeToUnread } = useMessages();

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
