import { PRICING, ZONES } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";

interface PriceRow {
  readonly game: string;
  readonly price: number;
  readonly unit: string;
}

interface ZonePricing {
  zoneId: string;
  rows: readonly PriceRow[];
}

const ZONE_PRICING: ZonePricing[] = [
  { zoneId: "main", rows: PRICING.mainLounge },
  { zoneId: "vip", rows: PRICING.vipLounge },
  { zoneId: "vr", rows: PRICING.vr },
];

export function PricingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ZONE_PRICING.map(({ zoneId, rows }) => {
        const zone = ZONES.find((z) => z.id === zoneId);
        if (!zone) return null;

        const isFeatured = zoneId === "vip";

        return (
          <div
            key={zoneId}
            className={cn(
              "relative rounded-xl border bg-surface p-6 transition-all duration-300",
              isFeatured
                ? "border-cyan/40 bg-gradient-to-b from-cyan/5 to-transparent animate-borderGlow"
                : "border-border hover:border-cyan/30"
            )}
          >
            {isFeatured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center font-semibold font-sans border rounded-full uppercase tracking-widest px-3.5 py-1 text-xs bg-cyan/10 text-cyan border-cyan/25">
                  Popular
                </span>
              </div>
            )}

            {/* Zone header */}
            <div className="text-center mb-6">
              <span className="text-4xl mb-3 block">{zone.icon}</span>
              <h3 className="font-heading text-xl font-bold text-text tracking-wide">
                {zone.name}
              </h3>
              <p className="text-xs text-text-muted mt-1">{zone.console}</p>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mb-6" />

            {/* Price rows */}
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.game}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-text-muted">{row.game}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-text">
                      {formatPrice(row.price)}
                    </span>
                    <span className="text-xs text-text-muted ml-1">
                      / {row.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
