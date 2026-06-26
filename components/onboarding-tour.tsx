"use client";

import { useRef, useState } from "react";
import {
  X,
  Trophy,
  ShoppingBag,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import type { LucideIcon } from "lucide-react";

const STORAGE_KEY = "cge:onboarding-seen:v1";

interface Step {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  eyebrow: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    iconClass: "text-cyan",
    bgClass: "bg-cyan/10 border-cyan/25",
    eyebrow: "Welcome to CGE",
    title: "Nigeria's gaming platform",
    body: "Four ways to play — pick whichever pulls you in. You can switch any time.",
  },
  {
    icon: Trophy,
    iconClass: "text-magenta",
    bgClass: "bg-magenta/10 border-magenta/25",
    eyebrow: "Esports",
    title: "Tournaments across Nigeria",
    body: "Solo or with a team. Open weekly brackets and major events with real prizes. Climb the national leaderboard.",
  },
  {
    icon: ShoppingBag,
    iconClass: "text-cyan",
    bgClass: "bg-cyan/10 border-cyan/25",
    eyebrow: "Marketplace",
    title: "Buy, sell, and swap gear",
    body: "Trade what you don't use anymore. Built-in safe-swap protection — both sides confirm shipping and receipt before ratings count.",
  },
  {
    icon: Users,
    iconClass: "text-green",
    bgClass: "bg-green/10 border-green/25",
    eyebrow: "Community",
    title: "Find your people",
    body: "Posts, polls, and topic threads from gamers nationwide. Read and post from the web; use the app later for faster alerts.",
  },
  {
    icon: Calendar,
    iconClass: "text-gold",
    bgClass: "bg-gold/10 border-gold/25",
    eyebrow: "Lounge",
    title: "Game in person",
    body: "Visit one of our gaming lounges — book PS4, PS5, or VR sessions, settle in with friends, and play.",
  },
];

interface OnboardingTourProps {
  isSignedIn: boolean;
}

// Shown to every first-time visitor, signed in or not — auth no longer gates the tour.
export function OnboardingTour(_props: OnboardingTourProps) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* private mode etc — ignore */
    }
  }

  // Esc dismisses the tour (same as Skip, including the "seen" flag)
  useFocusTrap(dialogRef, open, { onEscape: dismiss });

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-base/85 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden focus:outline-none"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tour"
            className="p-1 rounded-md hover:bg-surface-alt text-text-muted hover:text-text cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-8 text-center">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-5",
              current.bgClass,
            )}
          >
            <Icon size={28} className={current.iconClass} />
          </div>
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-2",
              current.iconClass,
            )}
          >
            {current.eyebrow}
          </p>
          <h2
            id="onboarding-tour-title"
            className="text-lg font-bold font-heading text-text mb-2"
          >
            {current.title}
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            {current.body}
          </p>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-text-muted hover:text-text uppercase tracking-wider cursor-pointer"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  i === step ? "w-5 bg-cyan" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (isLast) dismiss();
              else setStep((s) => s + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan/15 border border-cyan/35 text-cyan px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-cyan/25"
          >
            {isLast ? "Let's go" : "Next"}
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
