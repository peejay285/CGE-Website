"use client";

import { cn } from "@/lib/utils";

interface TabBarProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-surface-alt border border-border">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
            active === tab
              ? "bg-cyan/15 text-cyan"
              : "text-text-muted hover:text-text hover:bg-surface"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
