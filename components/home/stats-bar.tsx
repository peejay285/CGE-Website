import { Layers, Trophy, MapPin, Globe } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: string;
  label: string;
}

const STATS: StatItem[] = [
  { icon: <Layers size={20} className="text-magenta" />, value: "4", label: "Pillars, One Platform" },
  { icon: <Trophy size={20} className="text-gold" />, value: "₦500K+", label: "Prize Pool Paid Out" },
  { icon: <MapPin size={20} className="text-cyan" />, value: "Bonny Island", label: "Flagship Lounge" },
  { icon: <Globe size={20} className="text-green" />, value: "Nationwide", label: "Esports & Marketplace" },
];

export function StatsBar() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan/5 via-transparent to-magenta/5 pointer-events-none" />
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-0">
        {STATS.map((stat, idx) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center gap-2 py-8 px-4 ${
              idx < STATS.length - 1 ? "border-r border-border max-lg:odd:border-r max-lg:even:border-r-0 lg:border-r" : ""
            } ${idx < 2 ? "max-lg:border-b max-lg:border-border" : ""}`}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-alt border border-border flex items-center justify-center mb-1">
              {stat.icon}
            </div>
            <span className="font-heading text-2xl sm:text-3xl font-bold text-text text-center">
              {stat.value}
            </span>
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider text-center">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
