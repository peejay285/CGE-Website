"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const VARIANTS = [
  { label: "A", href: "/preview/home-a" },
  { label: "B", href: "/preview/home-b" },
  { label: "C", href: "/preview/home-c" },
  { label: "Current", href: "/" },
] as const;

/**
 * Fixed pill bar for flipping between homepage design previews.
 * Rendered ONLY on /preview/* pages — never on the live homepage.
 */
export function VariantSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Homepage design previews"
      className="fixed bottom-20 lg:bottom-4 left-1/2 z-[70] -translate-x-1/2"
    >
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface/95 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur">
        <span className="hidden sm:inline px-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Preview
        </span>
        {VARIANTS.map((variant) => {
          const active = pathname === variant.href;
          return (
            <Link
              key={variant.href}
              href={variant.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? "bg-cyan text-base"
                  : "text-text-muted hover:bg-surface-alt hover:text-text"
              )}
            >
              {variant.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
