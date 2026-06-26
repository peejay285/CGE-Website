import { Globe2, UserPlus, Gamepad2, ArrowRight } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: <Globe2 size={24} />,
    title: "Start on the Web",
    description: "Browse tournaments, gear, community posts, and lounge bookings from any device.",
    color: "cyan",
  },
  {
    step: "02",
    icon: <UserPlus size={24} />,
    title: "Create Your Profile",
    description: "Set your gamertag, pick your games, and build your reputation.",
    color: "magenta",
  },
  {
    step: "03",
    icon: <Gamepad2 size={24} />,
    title: "Start Gaming",
    description: "Enter tournaments, list gear, propose swaps, join discussions, and book sessions.",
    color: "green",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  cyan: { bg: "bg-cyan/10", text: "text-cyan", border: "border-cyan/20", glow: "shadow-cyan/10" },
  magenta: { bg: "bg-magenta/10", text: "text-magenta", border: "border-magenta/20", glow: "shadow-magenta/10" },
  green: { bg: "bg-green/10", text: "text-green", border: "border-green/20", glow: "shadow-green/10" },
};

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      {/* Connecting line (desktop) */}
      <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-cyan/30 via-magenta/30 to-green/30" />

      {STEPS.map((step, idx) => {
        const c = COLOR_MAP[step.color];
        return (
          <div key={step.step} className="relative flex flex-col items-center text-center">
            {/* Step number circle */}
            <div
              className={`w-14 h-14 rounded-2xl ${c.bg} ${c.text} ${c.border} border flex items-center justify-center mb-4 shadow-lg ${c.glow} relative z-10`}
            >
              {step.icon}
            </div>

            {/* Step label */}
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${c.text} mb-2`}>
              Step {step.step}
            </span>

            <h3 className="font-heading text-lg font-bold text-text tracking-wide mb-2">
              {step.title}
            </h3>

            <p className="text-sm text-text-muted leading-relaxed max-w-xs">
              {step.description}
            </p>

            {/* Arrow between steps (mobile) */}
            {idx < STEPS.length - 1 && (
              <div className="md:hidden my-4 text-border">
                <ArrowRight size={20} className="rotate-90" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
