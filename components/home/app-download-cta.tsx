import { Smartphone, Download, Bell, Zap, Shield } from "lucide-react";

const APP_PERKS = [
  { icon: <Zap size={16} />, text: "Faster check-ins, match updates, and saved actions" },
  { icon: <Bell size={16} />, text: "Push notifications for tournaments, swaps, bookings, and mentions" },
  { icon: <Shield size={16} />, text: "Member rewards, app-only drops, and secure payments" },
];

export function AppDownloadCta() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-cyan/5 rounded-full blur-[75px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-magenta/5 rounded-full blur-[75px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-green/3 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-6 sm:px-12 py-14 sm:py-16">
        {/* Left: text */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 w-fit">
            <Download size={12} className="text-cyan" />
            <span className="text-[11px] font-semibold text-cyan uppercase tracking-widest">Companion App</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text tracking-tight mb-4">
            CGE, FASTER IN<br />
            <span className="text-gradient">YOUR POCKET</span>
          </h2>

          <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-8 max-w-md">
            The web platform gives you the core CGE experience. The mobile app
            adds the fast layer for live events, reminders, rewards, and check-ins.
          </p>

          <ul className="space-y-3 mb-8">
            {APP_PERKS.map((perk, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-text/80">
                <div className="w-7 h-7 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0 text-cyan">
                  {perk.icon}
                </div>
                {perk.text}
              </li>
            ))}
          </ul>

          {/* App store badges — app not yet released */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-border opacity-70 cursor-default select-none">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-text" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <div>
                <div className="text-[9px] text-cyan uppercase tracking-wider leading-none">Coming soon to the</div>
                <div className="text-sm font-semibold text-text leading-tight">App Store</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-border opacity-70 cursor-default select-none">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-text" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.392 12l2.306-2.492zM5.864 3.658L16.8 9.99l-2.302 2.302-8.635-8.635z" />
              </svg>
              <div>
                <div className="text-[9px] text-cyan uppercase tracking-wider leading-none">Coming soon to</div>
                <div className="text-sm font-semibold text-text leading-tight">Google Play</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: phone illustration */}
        <div className="flex justify-center lg:justify-end items-center">
          <div className="relative">
            {/* Phone frame */}
            <div className="relative bg-surface border-2 border-border rounded-[2.5rem] p-3 shadow-2xl w-[260px]">
              <div className="bg-base rounded-[2rem] overflow-hidden py-6 px-4 space-y-4">
                {/* Mini logo */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/20 to-magenta/20 border border-border flex items-center justify-center">
                    <span className="font-heading text-xl font-bold text-gradient">CGE</span>
                  </div>
                </div>
                <p className="text-center text-[11px] text-text-muted">
                  Your gaming ecosystem
                </p>
                {/* Feature pills */}
                <div className="space-y-2">
                  {[
                    { label: "Esports & Tournaments", color: "text-magenta bg-magenta/10 border-magenta/20" },
                    { label: "Buy, Sell & Swap", color: "text-cyan bg-cyan/10 border-cyan/20" },
                    { label: "Gaming Community", color: "text-green bg-green/10 border-green/20" },
                    { label: "Book Gaming Sessions", color: "text-gold bg-gold/10 border-gold/20" },
                  ].map((f) => (
                    <div key={f.label} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium ${f.color}`}>
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow effects */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[180px] h-[50px] bg-cyan/20 rounded-full blur-[40px]" />
            <div className="absolute -top-4 -right-4 w-[80px] h-[80px] bg-magenta/10 rounded-full blur-[30px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
