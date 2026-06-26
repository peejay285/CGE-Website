"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Smartphone,
  Download,
  Trophy,
  ShoppingBag,
  Users,
  Zap,
  ArrowLeftRight,
  MessageCircle,
  Swords,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "./use-focus-trap";

// ── Gate context configs ────────────────────────────────────────────────────

type GateContext =
  | "marketplace-create"
  | "marketplace-buy"
  | "marketplace-swap"
  | "marketplace-chat"
  | "esports-register"
  | "esports-create"
  | "esports-team"
  | "community-post"
  | "community-comment"
  | "community-react"
  | "generic";

interface GateConfig {
  icon: typeof Smartphone;
  iconColor: string;
  title: string;
  subtitle: string;
  features: string[];
}

const GATE_CONFIGS: Record<GateContext, GateConfig> = {
  "marketplace-create": {
    icon: ShoppingBag,
    iconColor: "text-cyan",
    title: "List Items on CGE",
    subtitle: "Create listings, upload photos, and manage your shop on the web. The app adds faster swap alerts.",
    features: [
      "Post unlimited listings with photos",
      "In-app chat with buyers & sellers",
      "Real-time swap proposals & notifications",
    ],
  },
  "marketplace-buy": {
    icon: MessageCircle,
    iconColor: "text-cyan",
    title: "Buy and Message on CGE",
    subtitle: "Message sellers and negotiate on the web. The app keeps alerts closer to you.",
    features: [
      "Direct messaging with sellers",
      "Secure Paystack payments",
      "Order tracking & reviews",
    ],
  },
  "marketplace-swap": {
    icon: ArrowLeftRight,
    iconColor: "text-magenta",
    title: "Swap on CGE",
    subtitle: "Propose swaps and trade gaming gear with the community on web or mobile.",
    features: [
      "One-tap swap proposals",
      "Browse & compare swap offers",
      "Full trade history & protection",
    ],
  },
  "marketplace-chat": {
    icon: MessageCircle,
    iconColor: "text-green",
    title: "Chat on CGE",
    subtitle: "Message sellers and buyers directly. The app adds push notifications for replies.",
    features: [
      "Real-time messaging",
      "Push notifications for replies",
      "Share images & listing links",
    ],
  },
  "esports-register": {
    icon: Trophy,
    iconColor: "text-magenta",
    title: "Join Tournaments on CGE",
    subtitle: "Register from the web. The app adds faster check-ins and match reminders.",
    features: [
      "One-tap tournament registration",
      "Live bracket updates & check-in",
      "Match result reporting",
    ],
  },
  "esports-create": {
    icon: Swords,
    iconColor: "text-magenta",
    title: "Host Tournaments on CGE",
    subtitle: "Create and manage tournaments, set rules, and run brackets from the web.",
    features: [
      "Full tournament creation & management",
      "Automated bracket generation",
      "Entry fee collection via Paystack",
    ],
  },
  "esports-team": {
    icon: Users,
    iconColor: "text-cyan",
    title: "Build Teams on CGE",
    subtitle: "Create or join teams, manage rosters, and compete together on web or mobile.",
    features: [
      "Create & manage team rosters",
      "Team tournaments & rankings",
      "Team chat & coordination",
    ],
  },
  "community-post": {
    icon: Users,
    iconColor: "text-green",
    title: "Post in the CGE Community",
    subtitle: "Share clips, start discussions, and connect with gamers across Africa on web or mobile.",
    features: [
      "Create posts with polls & media",
      "Topic channels & hashtags",
      "Mention & follow other gamers",
    ],
  },
  "community-comment": {
    icon: MessageCircle,
    iconColor: "text-green",
    title: "Join the Conversation",
    subtitle: "Comment, react, and engage with the gaming community on CGE.",
    features: [
      "Reply to posts & threads",
      "Emoji reactions & bookmarks",
      "Push notifications for mentions",
    ],
  },
  "community-react": {
    icon: Zap,
    iconColor: "text-gold",
    title: "React & Engage on CGE",
    subtitle: "Use reactions, bookmark posts, and build your community reputation.",
    features: [
      "7 custom reaction types",
      "Bookmark your favorite posts",
      "Build community trust & reputation",
    ],
  },
  generic: {
    icon: Smartphone,
    iconColor: "text-cyan",
    title: "CGE Mobile Companion",
    subtitle: "Use the full platform on the web. The app adds faster alerts, check-ins, rewards, and live event tools.",
    features: [
      "Push notifications and live match reminders",
      "Quick lounge check-ins and event updates",
      "Member rewards and app-only drops",
    ],
  },
};

// ── Custom event for triggering the gate ─────────────────────────────────

export function triggerAppGate(context: GateContext = "generic") {
  window.dispatchEvent(
    new CustomEvent("open-app-gate", { detail: { context } })
  );
}

// ── App Gate Modal Component ─────────────────────────────────────────────

export function AppGateModal() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<GateContext>("generic");
  const gateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent).detail;
      setContext(detail?.context || "generic");
      setOpen(true);
    }
    window.addEventListener("open-app-gate", handleOpen);
    return () => window.removeEventListener("open-app-gate", handleOpen);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => setOpen(false), []);

  useFocusTrap(gateRef, open, { onEscape: handleClose });

  if (!open) return null;

  const config = GATE_CONFIGS[context];
  const Icon = config.icon;

  return (
    <div ref={gateRef}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={handleClose}
      />

      {/* Desktop: centered modal */}
      <div className="fixed inset-0 z-[71] hidden sm:flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-gate-title-desktop"
          tabIndex={-1}
          className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-slideUp focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GateContent
            config={config}
            Icon={Icon}
            onClose={handleClose}
            headingId="app-gate-title-desktop"
          />
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[71] sm:hidden">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-gate-title-mobile"
          tabIndex={-1}
          className="bg-surface border-t border-border rounded-t-2xl shadow-2xl overflow-hidden animate-slideUp max-h-[90vh] overflow-y-auto focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <GateContent
            config={config}
            Icon={Icon}
            onClose={handleClose}
            headingId="app-gate-title-mobile"
          />
        </div>
      </div>
    </div>
  );
}

// ── Gate Content ─────────────────────────────────────────────────────────

function GateContent({
  config,
  Icon,
  onClose,
  headingId,
}: {
  config: GateConfig;
  Icon: typeof Smartphone;
  onClose: () => void;
  headingId: string;
}) {
  return (
    <div className="px-6 pb-8 pt-4">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
      >
        <X size={16} />
      </button>

      {/* Icon + glow */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            config.iconColor === "text-cyan" ? "bg-cyan/10 border border-cyan/20" :
            config.iconColor === "text-magenta" ? "bg-magenta/10 border border-magenta/20" :
            config.iconColor === "text-green" ? "bg-green/10 border border-green/20" :
            "bg-gold/10 border border-gold/20"
          )}>
            <Icon size={28} className={config.iconColor} />
          </div>
          <div className={cn(
            "absolute -inset-3 rounded-3xl blur-xl opacity-20 -z-10",
            config.iconColor === "text-cyan" ? "bg-cyan" :
            config.iconColor === "text-magenta" ? "bg-magenta" :
            config.iconColor === "text-green" ? "bg-green" :
            "bg-gold"
          )} />
        </div>
      </div>

      {/* Title */}
      <h3
        id={headingId}
        className="font-heading text-xl font-bold text-text text-center mb-2 tracking-tight"
      >
        {config.title}
      </h3>
      <p className="text-sm text-text-muted text-center mb-6 leading-relaxed max-w-sm mx-auto">
        {config.subtitle}
      </p>

      {/* Features */}
      <div className="space-y-2.5 mb-7">
        {config.features.map((feature, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm text-text/80">{feature}</span>
          </div>
        ))}
      </div>

      {/* App store buttons — app not yet released */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-cyan text-base font-semibold cursor-default select-none">
          <Download size={18} />
          App Perks
          <span className="text-[10px] font-bold uppercase tracking-wider bg-base/15 rounded-full px-2 py-0.5">
            Coming soon
          </span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-surface-alt border border-border text-sm font-medium text-text opacity-70 cursor-default select-none">
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              iOS
            </span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">Coming soon</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-surface-alt border border-border text-sm font-medium text-text opacity-70 cursor-default select-none">
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.392 12l2.306-2.492zM5.864 3.658L16.8 9.99l-2.302 2.302-8.635-8.635z" />
              </svg>
              Android
            </span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Dismiss link */}
      <button
        type="button"
        onClick={onClose}
        className="w-full text-center mt-4 text-[11px] text-text-muted hover:text-text transition-colors cursor-pointer"
      >
        Continue browsing on web
      </button>
    </div>
  );
}

// ── Inline Preview Banner (for pillar pages) ─────────────────────────────

interface AppGateBannerProps {
  pillar: "marketplace" | "esports" | "community";
}

// Use full class names so Tailwind can detect them at build time
const BANNER_CONFIG: Record<string, {
  icon: typeof Trophy;
  text: string;
  subtitle: string;
  wrapperClass: string;
  iconBgClass: string;
  iconClass: string;
  btnClass: string;
}> = {
  marketplace: {
    icon: ShoppingBag,
    text: "Buy, sell, and swap gaming gear on the web",
    subtitle: "The app will add faster swap alerts and member perks",
    wrapperClass: "border-cyan/20 bg-gradient-to-r from-cyan/10 to-cyan/5",
    iconBgClass: "bg-cyan/15",
    iconClass: "text-cyan",
    btnClass: "bg-cyan hover:bg-cyan/90 text-base",
  },
  esports: {
    icon: Trophy,
    text: "Host, join, and manage tournaments on the web",
    subtitle: "The app will add check-ins, live alerts, and rewards",
    wrapperClass: "border-magenta/20 bg-gradient-to-r from-magenta/10 to-magenta/5",
    iconBgClass: "bg-magenta/15",
    iconClass: "text-magenta",
    btnClass: "bg-magenta hover:bg-magenta/90 text-white",
  },
  community: {
    icon: Users,
    text: "Post, react, and connect on the web",
    subtitle: "The app will add notifications and faster media sharing",
    wrapperClass: "border-green/20 bg-gradient-to-r from-green/10 to-green/5",
    iconBgClass: "bg-green/15",
    iconClass: "text-green",
    btnClass: "bg-green hover:bg-green/90",
  },
};

export function AppGateBanner({ pillar }: AppGateBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const config = BANNER_CONFIG[pillar];
  const BannerIcon = config.icon;

  if (dismissed) return null;

  return (
    <div className={cn(
      "relative rounded-xl border px-4 py-3 mb-5 overflow-hidden",
      config.wrapperClass
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          config.iconBgClass
        )}>
          <BannerIcon size={18} className={config.iconClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text mb-0.5">
            {config.text}
          </p>

          <p className="text-[10px] text-text-muted">
            {config.subtitle}
          </p>
        </div>
        <a
          href="#download"
          onClick={(e) => {
            e.preventDefault();
            triggerAppGate("generic");
          }}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors",
            config.btnClass
          )}
        >
          Get App
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
