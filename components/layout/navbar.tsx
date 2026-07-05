"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Calendar,
  Gamepad2,
  User,
  Wallet,
  IdCard,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
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
  const [avatar, setAvatar] = useState<{ userId: string; url: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const avatarUrl = avatar && avatar.userId === user?.id ? avatar.url : null;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the avatar menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close the avatar menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Pull the user's avatar_url so the navbar shows their actual picture, not
  // just an initial. Refetches when the user changes or another tab/page
  // dispatches an "avatar-updated" event (the AvatarPicker fires it).
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    let cancelled = false;
    const fetchAvatar = () => {
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id!)
        .maybeSingle()
        .then(({ data }: { data: { avatar_url: string | null } | null }) => {
          if (!cancelled) {
            setAvatar({ userId: user.id!, url: data?.avatar_url ?? null });
          }
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
      {/* Neon hairline — fades in once the bar goes glass */}
      <span
        aria-hidden
        className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent transition-opacity duration-500 pointer-events-none ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="transition-transform duration-200 hover:scale-[1.04] active:scale-100"
          >
            <CGELogo size={36} showText />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${
                    active ? "text-cyan" : "text-text-muted hover:text-text"
                  }`}
                >
                  {link.label}
                  {/* Animated gradient underline */}
                  <span
                    aria-hidden
                    className={`absolute left-3 right-3 bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-cyan to-magenta origin-left transition-all duration-300 ease-out ${
                      active
                        ? "opacity-100 scale-x-100 shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                        : "opacity-0 scale-x-0 group-hover:opacity-70 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {user && (
              <Link
                href="/messages"
                aria-label="Messages"
                className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border bg-surface-alt/60 text-text-muted transition-all duration-200 hover:text-cyan hover:border-cyan/40 hover:shadow-[0_0_12px_rgba(0,240,255,0.25)]"
              >
                <MessageCircle size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-magenta text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(255,45,120,0.6)]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link href="/lounge" className="group relative">
              <Button size="sm" className="relative overflow-hidden animate-ctaGlow">
                <Gamepad2 size={15} className="transition-transform duration-300 group-hover:-rotate-12" />
                Book Now
                {/* Light streak sweeping across every few seconds */}
                <span
                  aria-hidden
                  className="animate-ctaSweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                />
              </Button>
            </Link>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-[0_0_14px_rgba(0,240,255,0.35)] ${
                    menuOpen || pathname.startsWith("/profile")
                      ? "bg-cyan/15 border-cyan/50 text-cyan shadow-[0_0_14px_rgba(0,240,255,0.25)]"
                      : "bg-surface-alt border-border hover:border-cyan/50 text-text"
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
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface shadow-xl p-1.5 z-50"
                  >
                    <p className="px-3 py-2 text-xs text-text-muted truncate border-b border-border mb-1">
                      {user.email}
                    </p>
                    <Link
                      role="menuitem"
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-surface-alt rounded-lg transition-colors"
                    >
                      <User size={16} className="text-text-muted" />
                      My Profile
                    </Link>
                    <Link
                      role="menuitem"
                      href="/profile/wallet"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-surface-alt rounded-lg transition-colors"
                    >
                      <Wallet size={16} className="text-text-muted" />
                      Wallet
                    </Link>
                    {user.id && (
                      <Link
                        role="menuitem"
                        href={`/player/${user.id}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-surface-alt rounded-lg transition-colors"
                      >
                        <IdCard size={16} className="text-text-muted" />
                        Player Card
                      </Link>
                    )}
                    <Link
                      role="menuitem"
                      href="/profile/swaps"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-surface-alt rounded-lg transition-colors"
                    >
                      <ArrowLeftRight size={16} className="text-text-muted" />
                      My Swaps
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout?.();
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red hover:bg-red/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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
