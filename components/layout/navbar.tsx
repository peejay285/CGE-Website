"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Calendar, User } from "lucide-react";
import { CGELogo } from "./cge-logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  onAuthClick: () => void;
  user?: { id?: string; email?: string } | null;
  onLogout?: () => void;
  unreadCount?: number;
}

export function Navbar({ onAuthClick, user, onLogout, unreadCount = 0 }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Pull the user's avatar_url so the navbar shows their actual picture, not
  // just an initial. Refetches when the user changes or another tab/page
  // dispatches an "avatar-updated" event (the AvatarPicker fires it).
  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(null);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const fetchAvatar = () => {
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id!)
        .maybeSingle()
        .then(({ data }: { data: { avatar_url: string | null } | null }) => {
          if (!cancelled) setAvatarUrl(data?.avatar_url ?? null);
        });
    };
    fetchAvatar();
    const onUpdated = () => fetchAvatar();
    window.addEventListener("avatar-updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("avatar-updated", onUpdated);
    };
  }, [user?.id]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link href="/">
            <CGELogo size={36} showText />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                  pathname === link.href
                    ? "text-cyan bg-cyan/10"
                    : "text-text-muted hover:text-text hover:bg-surface-alt"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {user && (
              <Link href="/messages" className="relative p-2 text-text-muted hover:text-text transition-colors">
                <MessageCircle size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-magenta text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link href="/lounge">
              <Button size="sm">Book Now</Button>
            </Link>
            {user ? (
              <>
                <Link
                  href="/profile"
                  aria-label="Open your profile"
                  aria-current={pathname.startsWith("/profile") ? "page" : undefined}
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 overflow-hidden transition-all cursor-pointer ${
                    pathname.startsWith("/profile")
                      ? "bg-cyan/15 border-cyan/50 text-cyan"
                      : "bg-surface-alt border-border hover:border-cyan/40 text-text"
                  }`}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase">
                      {(user.email?.[0] ?? "U").toUpperCase()}
                    </span>
                  )}
                </Link>
                <button
                  onClick={onLogout}
                  className="text-xs font-semibold text-text-muted hover:text-text uppercase tracking-wider cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onAuthClick}>
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile: Quick actions (Book Now + Profile + Auth) — bottom bar handles main nav */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/lounge">
              <Button size="sm" className="text-[11px] px-3 py-1.5 h-auto">
                <Calendar size={14} />
                Book
              </Button>
            </Link>
            {user ? (
              <Link
                href="/profile"
                aria-label="Open your profile"
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 overflow-hidden transition-all ${
                  pathname.startsWith("/profile")
                    ? "bg-cyan/15 border-cyan/50 text-cyan"
                    : "bg-surface-alt border-border text-text"
                }`}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} />
                )}
              </Link>
            ) : (
              <Button variant="ghost" size="sm" className="text-[11px] px-3 py-1.5 h-auto" onClick={onAuthClick}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
