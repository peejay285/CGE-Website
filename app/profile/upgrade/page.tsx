"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Check,
  Loader2,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const PREMIUM_PRICE_NAIRA = 2000;
const PREMIUM_PERIOD_DAYS = 30;

const PERKS = [
  {
    icon: ShieldCheck,
    title: "Verified profile review",
    body: "Submit your ID for manual verification — get a verified badge that appears on every listing.",
  },
  {
    icon: ImageIcon,
    title: "Higher listing limits",
    body: "More photos per listing, video listings, and a higher monthly listing cap.",
  },
  {
    icon: Sparkles,
    title: "Featured swap matches",
    body: "Your offered listings show up first when other users browse swap candidates.",
  },
  {
    icon: TrendingUp,
    title: "Priority placement",
    body: "Premium listings appear before free listings within a category and state filter.",
  },
];

export default function UpgradePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, premium_tier, premium_expires_at, is_id_verified")
        .eq("id", user.id)
        .maybeSingle();
      setProfile((data as Profile | null) ?? null);
      setLoading(false);
    })();
  }, [user, supabase]);

  const isPremium =
    profile?.premium_tier === "premium" &&
    profile?.premium_expires_at != null &&
    new Date(profile.premium_expires_at) > new Date();

  async function handlePay() {
    if (!user) return;
    setPaying(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: PREMIUM_PRICE_NAIRA,
          type: "premium",
          metadata: {
            user_id: user.id,
            period_days: PREMIUM_PERIOD_DAYS,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to start payment");
      }
      const { authorization_url } = await res.json();
      window.location.href = authorization_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment");
      setPaying(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-text mb-2">
            Sign in to upgrade to Premium
          </h2>
          <Button
            variant="primary"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-auth-modal"))
            }
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} />
          Back to profile
        </Link>

        <div className="flex items-center gap-2">
          <Crown size={20} className="text-gold" />
          <h1 className="text-lg font-bold font-heading text-text">
            CGE Premium
          </h1>
        </div>

        {isPremium && (
          <div className="rounded-xl border border-green/30 bg-green/5 p-4 flex items-start gap-3">
            <Check size={18} className="text-green shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green">
                You&apos;re on Premium
              </p>
              <p className="text-xs text-text-muted mt-1">
                Renews / expires{" "}
                {profile?.premium_expires_at
                  ? new Date(profile.premium_expires_at).toLocaleDateString()
                  : "—"}
                . Manage from this page.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-magenta/30 bg-gradient-to-br from-magenta/5 to-cyan/5 p-5">
          <p className="text-3xl font-bold font-heading text-text">
            ₦{PREMIUM_PRICE_NAIRA.toLocaleString()}
            <span className="text-base font-normal text-text-muted">
              {" "}
              / month
            </span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            One Paystack payment unlocks {PREMIUM_PERIOD_DAYS} days of Premium.
          </p>
        </div>

        <div className="space-y-3">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="rounded-xl border border-border bg-surface-alt p-4 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan/10 border border-cyan/25 flex items-center justify-center shrink-0">
                <perk.icon size={16} className="text-cyan" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{perk.title}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  {perk.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!isPremium && (
          <Button
            variant="primary"
            fullWidth
            disabled={paying}
            onClick={handlePay}
            className="bg-gradient-to-br from-magenta to-magenta/80"
          >
            {paying ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Crown size={14} />
            )}
            {paying ? "Redirecting to Paystack..." : "Upgrade with Paystack"}
          </Button>
        )}

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          One-time {PREMIUM_PERIOD_DAYS}-day pass. No auto-renew. Pay again from
          this page when it expires.
        </p>
      </div>
    </div>
  );
}
