import Image from "next/image";
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
 * Photoreal device mockup — the hero prop for preview variants A and C.
 * A generated product render of a phone (public/images/preview/
 * phone-frame.webp, cropped 430x805 from the original 896x1200) with the
 * live CGE mini-app UI composited onto the screen area.
 *
 * Screen geometry measured from the render (percentages of the crop):
 *   left 8.60% · top 3.73% · width 81.86% · height 92.67%
 * The punch-hole camera is baked into the image at the screen's top
 * center, so the overlay stays transparent there and the status bar
 * flanks it. Levitation float + breathing floor shadow via globals.css.
 */
export function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative shrink-0 select-none sm:[transform:rotate(-2deg)]"
    >
      {/* Floating levitation */}
      <div className="animate-phoneFloat">
        <div className="relative w-[280px] sm:w-[310px]">
          <Image
            src="/images/preview/phone-frame.webp"
            alt=""
            width={430}
            height={805}
            priority
            className="h-auto w-full"
          />

          {/* Screen overlay — transparent bg so the render's glass (and
              punch-hole camera) show through beneath the UI */}
          <div
            className="absolute flex flex-col overflow-hidden rounded-[18px]"
            style={{
              left: "8.6%",
              top: "3.73%",
              width: "81.86%",
              height: "92.67%",
            }}
          >
            {/* Status bar — flanks the baked-in punch-hole camera */}
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
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
            <div className="flex items-center justify-between px-3.5 pb-1 pt-2">
              <div>
                <p className="text-[11.5px] font-semibold text-text">
                  Good evening, Ada
                </p>
                <p className="text-[9px] text-text-muted">
                  Bonny Island &middot; 2 tournaments this week
                </p>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 text-[9px] font-bold text-cyan">
                A
              </span>
            </div>

            {/* App content */}
            <div className="space-y-2 px-3 pt-2">
              <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                    <Trophy size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold text-text">
                      FC26 Weekly Cup
                    </p>
                    <p className="text-[9px] font-medium text-cyan">
                      &#8358;50,000 &middot; 3 slots left
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan px-2 py-0.5 text-[8.5px] font-bold text-base">
                    Join
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-4/5 rounded-full bg-cyan" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-alt text-text-muted">
                    <Repeat size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold text-text">
                      PS5 swap offer
                    </p>
                    <p className="text-[9px] text-text-muted">
                      DualSense + &#8358;15k top-up &middot; 2.1 km away
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10.5px] font-semibold text-text">
                      Saturday, 4 PM
                    </p>
                    <p className="text-[9px] text-text-muted">
                      VIP Lounge &middot; PS5 &middot; 2 hours
                    </p>
                  </div>
                  <span className="rounded-md border border-green/30 bg-green/10 px-1.5 py-0.5 text-[8.5px] font-semibold text-green">
                    Confirmed
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 rounded-full bg-cyan py-2 text-[10.5px] font-semibold text-base">
                <Gamepad2 size={12} />
                Book a station
              </div>
            </div>

            {/* Push nav to the bottom of the glass */}
            <div className="flex-1" />

            {/* Bottom nav — mirrors the real mobile nav */}
            <div className="flex items-center justify-around border-t border-border/60 bg-surface/70 px-2 pb-1 pt-1.5 backdrop-blur-sm">
              <span className="flex flex-col items-center gap-0.5 text-cyan">
                <Home size={11} />
                <span className="text-[7px] font-semibold">Home</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <Trophy size={11} />
                <span className="text-[7px]">Esports</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <ShoppingBag size={11} />
                <span className="text-[7px]">Market</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <Users size={11} />
                <span className="text-[7px]">Community</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 text-text-muted">
                <MessageCircle size={11} />
                <span className="text-[7px]">Chats</span>
              </span>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-1.5 pt-1">
              <span className="h-1 w-14 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Floor shadow — breathes opposite the float so the phone reads as
          rising away from the ground, not the whole scene bobbing */}
      <div className="absolute -bottom-7 left-1/2 h-6 w-3/4 -translate-x-1/2">
        <div className="animate-phoneShadow h-full w-full rounded-[100%] bg-black/55 blur-xl" />
      </div>
    </div>
  );
}
