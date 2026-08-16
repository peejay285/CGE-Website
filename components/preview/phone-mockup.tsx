import { Gamepad2, Repeat, Trophy } from "lucide-react";

/**
 * Pure-CSS phone frame showing a miniature CGE app moment — the hero prop
 * for preview variants A and C. Display only, no interactivity.
 */
export function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="w-[220px] sm:w-[240px] shrink-0 select-none rounded-[2rem] border border-border bg-surface p-2 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
    >
      {/* Screen */}
      <div className="overflow-hidden rounded-[1.55rem] border border-border/60 bg-base">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[9px] font-semibold tracking-wide text-text-muted">
            19:42
          </span>
          <span className="h-3.5 w-16 rounded-full bg-surface-alt" />
          <span className="flex items-center gap-0.5">
            <span className="h-1 w-1 rounded-full bg-text-muted/70" />
            <span className="h-1 w-1 rounded-full bg-text-muted/70" />
            <span className="h-1 w-1 rounded-full bg-cyan" />
          </span>
        </div>

        {/* App content */}
        <div className="space-y-2.5 px-3 pb-4 pt-1.5">
          {/* Greeting */}
          <div className="px-1">
            <p className="text-[11px] font-semibold text-text">
              Good evening, Ada
            </p>
            <p className="text-[9px] text-text-muted">
              Bonny Island &middot; 2 tournaments this week
            </p>
          </div>

          {/* Tournament card */}
          <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-2.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                <Trophy size={12} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold text-text">
                  FC26 Weekly Cup
                </p>
                <p className="text-[9px] font-medium text-cyan">
                  &#8358;50,000 &middot; 3 slots left
                </p>
              </div>
            </div>
          </div>

          {/* Swap card */}
          <div className="rounded-xl border border-border bg-surface p-2.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                <Repeat size={12} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold text-text">
                  PS5 swap offer
                </p>
                <p className="text-[9px] text-text-muted">2.1 km away</p>
              </div>
            </div>
          </div>

          {/* Book CTA */}
          <div className="flex items-center justify-center gap-1.5 rounded-full bg-cyan py-2 text-[10px] font-semibold text-base">
            <Gamepad2 size={12} />
            Book a station
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2.5">
          <span className="h-1 w-16 rounded-full bg-surface-alt" />
        </div>
      </div>
    </div>
  );
}
