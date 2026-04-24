"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  ShoppingBag,
  Trophy,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  user?: { email?: string } | null;
  onAuthClick: () => void;
  unreadCount?: number;
}

import type { LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ShoppingBag, label: "Market", href: "/marketplace" },
  { icon: Trophy, label: "Esports", href: "/esports" },
  { icon: MessageCircle, label: "Messages", href: "/messages", requiresAuth: true },
  { icon: User, label: "Profile", href: "/profile", requiresAuth: true },
];

export function MobileBottomNav({
  user,
  onAuthClick,
  unreadCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-14 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const needsAuth = item.requiresAuth && !user;
          const showBadge = item.href === "/messages" && unreadCount > 0 && user;

          const handleClick = (e: React.MouseEvent) => {
            if (needsAuth) {
              e.preventDefault();
              onAuthClick();
            }
          };

          return (
            <Link
              key={item.href}
              href={needsAuth ? "#" : item.href}
              onClick={handleClick}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full relative transition-colors active:scale-95",
                active ? "text-cyan" : "text-text-muted"
              )}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  className="transition-all"
                />
                {/* Unread badge */}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-magenta text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none font-medium transition-colors",
                  active ? "text-cyan" : "text-text-muted"
                )}
              >
                {item.label}
              </span>
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-cyan" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
