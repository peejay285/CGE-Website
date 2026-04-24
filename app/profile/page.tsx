"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  ShoppingBag,
  ArrowLeftRight,
  Trophy,
  Star,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useSellerProfile } from "@/hooks/use-seller-profile";
import { StarRating, TRUST_CONFIG } from "@/components/marketplace/seller-profile-card";
import { cn } from "@/lib/utils";
import type { SellerProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { getSellerProfile, loading } = useSellerProfile();
  const [profile, setProfile] = useState<SellerProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await getSellerProfile(user.id);
      setProfile(data);
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-surface-alt border border-border flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-text-muted" />
          </div>
          <h2 className="text-lg font-bold font-heading text-text mb-2">
            Sign in to view your profile
          </h2>
          <p className="text-sm text-text-muted mb-6">
            Track your listings, reviews, and marketplace activity.
          </p>
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

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-cyan" />
      </div>
    );
  }

  const trustLevel =
    (profile.stats?.trust_level as keyof typeof TRUST_CONFIG) ?? "new";
  const config = TRUST_CONFIG[trustLevel];
  const TrustIcon = config.icon;
  const stats = profile.stats;

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-NG",
    { month: "long", year: "numeric" }
  );

  const menuItems = [
    {
      icon: ShoppingBag,
      label: "My Listings",
      description: `${stats?.total_listings ?? 0} active`,
      href: "/marketplace?mine=true",
      color: "text-cyan",
    },
    {
      icon: ArrowLeftRight,
      label: "My Swaps",
      description: `${stats?.total_swaps ?? 0} completed`,
      href: "/marketplace?swaps=true",
      color: "text-magenta",
    },
    {
      icon: Trophy,
      label: "Tournaments",
      description: "View your tournament history",
      href: "/esports",
      color: "text-gold",
    },
    {
      icon: Calendar,
      label: "Bookings",
      description: "Your booking history",
      href: "/lounge",
      color: "text-green",
    },
  ];

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-cyan/10 border-2 border-cyan/25 flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-cyan">
                {(profile.full_name || "CM").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold font-heading text-text truncate">
              {profile.full_name || "CGE Member"}
            </h1>
            {profile.gamertag && (
              <p className="text-sm text-text-muted">@{profile.gamertag}</p>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-2 py-0.5 border mt-1",
                config.bg,
                config.border,
                config.color
              )}
            >
              <TrustIcon size={10} />
              {config.label}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-alt border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star size={14} className="text-gold" />
              <span className="text-sm font-bold text-text">
                {stats && stats.rating_count > 0
                  ? stats.avg_rating.toFixed(1)
                  : "-"}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">Rating</p>
          </div>
          <div className="rounded-xl bg-surface-alt border border-border p-3 text-center">
            <span className="text-sm font-bold text-text">
              {stats?.total_sales ?? 0}
            </span>
            <p className="text-[10px] text-text-muted mt-0.5">Sales</p>
          </div>
          <div className="rounded-xl bg-surface-alt border border-border p-3 text-center">
            <span className="text-sm font-bold text-text">
              {stats?.total_swaps ?? 0}
            </span>
            <p className="text-[10px] text-text-muted mt-0.5">Swaps</p>
          </div>
        </div>

        {/* Menu items */}
        <div className="rounded-xl bg-surface-alt border border-border overflow-hidden divide-y divide-border">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface transition-colors active:scale-[0.99]"
            >
              <item.icon size={18} className={item.color} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="text-[11px] text-text-muted">{item.description}</p>
              </div>
              <ChevronRight size={16} className="text-text-muted shrink-0" />
            </Link>
          ))}
        </div>

        {/* Member info */}
        <div className="rounded-xl bg-surface-alt border border-border p-4">
          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Shield size={12} />
            Member since {memberSince}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {user.email}
          </p>
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          fullWidth
          className="text-red hover:text-red hover:bg-red/10"
          onClick={signOut}
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
