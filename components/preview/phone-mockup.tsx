import {
  BatteryMedium,
  Gamepad2,
  Home,
  MessageCircle,
  Repeat,
  ShoppingBag,
  Signal,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";

/**
 * Realistic device mockup showing a miniature CGE app moment — the hero
 * prop for preview variants A and C (Bolt/JobSpotta product-render style).
 * Pure CSS: metallic frame, punch-hole camera, side buttons, status bar,
 * app UI with the real five-tab bottom nav, slight showroom tilt.
 * Display only, no interactivity.
 */
export function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative shrink-0 select-none [transform:rotate(-4deg)] sm:[transform:perspective(1200px)_rotateY(-8deg)_rotate(-3deg)]"
    >
      {/* Device body — metallic edge via layered borders */}
      <div className="relative w-[240px] sm:w-[260px] rounded-[2.6rem] bg-[#3a3d44] p-[3px] shadow-[0_30px_80px_rgba(0,0,0,0.65),0_8px_24px_rgba(0,0,0,0.4)]">
        {/* Side buttons */}
        <span className="absolute -left-[2px] top-[88px] h-9 w-[3px] rounded-l-md bg-[#2b2d33]" />
        <span className="absolute -left-[2px] top-[132px] h-14 w-[3px] rounded-l-md bg-[#2b2d33]" />
        <span className="absolute -right-[2px] top-[108px] h-16 w-[3px] rounded-r-md bg-[#2b2d33]" />

        {/* Inner bezel */}
        <div className="rounded-[2.45rem] bg-black p-[7px]">
          {/* Screen */}
          <div className="relative overflow-hidden rounded-[2rem] bg-base">
            {/* Subtle screen sheen */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0%,transparent_30%)]" />

            {/* Punch-hole camera */}
            <span className="absolute left-1/2 top-2.5 z-20 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black ring-1 ring-[#1c1e22]" />

            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pb-1 pt-2.5">
              <span className="text-[10px] font-semibold tracking-wide text-text">
                19:42
              </span>
              <span className="flex items-center gap-1 text-text-muted">
                <Signal size={9} />
                <Wifi size={9} />
                <BatteryMedium size={11} />
              </span>
            </div>

            {/* App header */}
            <div className="flex items-center justify-between px-4 pb-1 pt-1.5">
              <div>
                <p className="text-[11px] font-semibold text-text">
                  Good evening, Ada
                </p>
                <p className="text-[8.5px] text-text-muted">
                  Bonny Island &middot; 2 tournaments this week
                </p>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 text-[9px] font-bold text-cyan">
                A
              </span>
            </div>

            {/* App content */}
            <div className="space-y-2 px-3 pb-3 pt-1.5">
              <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                    <Trophy size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-text">
                      FC26 Weekly Cup
                    </p>
                    <p className="text-[8.5px] font-medium text-cyan">
                      &#8358;50,000 &middot; 3 slots left
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan px-2 py-0.5 text-[8px] font-bold text-base">
                    Join
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full w-4/5 rounded-full bg-cyan" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                    <Repeat size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-text">
                      PS5 swap offer
                    </p>
                    <p className="text-[8.5px] text-text-muted">
                      DualSense + &#8358;15k top-up &middot; 2.1 km away
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-text">
                      Saturday, 4 PM
                    </p>
                    <p className="text-[8.5px] text-text-muted">
                      VIP Lounge &middot; PS5 &middot; 2 hours
                    </p>
                  </div>
                  <span className="rounded-md border border-green/30 bg-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-green">
                    Confirmed
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 rounded-full bg-cyan py-2 text-[10px] font-semibold text-base">
                <Gamepad2 size={12} />
                Book a station
              </div>
            </div>

            {/* Bottom nav — mirrors the real mobile nav */}
            <div className="flex items-center justify-around border-t border-border/60 bg-surface/80 px-2 pb-1 pt-1.5">
              <span className="flex flex-col items-center gap-0.5 text-cyan">
                <Home size={11} />
                <span className="text-[6.5px] font-semibold">Home</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <Trophy size={11} />
                <span className="text-[6.5px]">Esports</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <ShoppingBag size={11} />
                <span className="text-[6.5px]">Market</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <Users size={11} />
                <span className="text-[6.5px]">Community</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <MessageCircle size={11} />
                <span className="text-[6.5px]">Chats</span>
              </span>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-2 pt-1">
              <span className="h-1 w-16 rounded-full bg-surface-alt" />
            </div>
          </div>
        </div>
      </div>

      {/* Floor shadow for the showroom feel */}
      <div className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[100%] bg-black/50 blur-xl" />
    </div>
  );
}
