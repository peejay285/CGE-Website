import { PRICING, ZONES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface PriceRow {
  readonly game: string;
  readonly price: number;
  readonly unit: string;
}

const ZONE_PRICING: Record<string, readonly PriceRow[]> = {
  main: PRICING.mainLounge,
  vip: PRICING.vipLounge,
  vr: PRICING.vr,
};

/**
 * One card per zone with the full story: what it is, what's in it,
 * and what it costs. (Merged from the old ZoneComparison + PricingGrid,
 * which repeated the same three zones twice.)
 */
export function ZoneComparison() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ZONES.map((zone) => {
        const isVip = zone.id === "vip";
        const rows = ZONE_PRICING[zone.id] ?? [];

        return (
          <Card
            key={zone.id}
            featured={isVip}
            className="flex flex-col items-center text-center"
          >
            {/* Badge for VIP */}
            {isVip && (
              <div className="mb-4">
                <Badge color="gold" size="md">
                  Premium
                </Badge>
              </div>
            )}

            {/* Icon */}
            <span className="text-5xl mb-4 block">{zone.icon}</span>

            {/* Name */}
            <h3 className="font-heading text-xl font-bold text-text tracking-wide mb-2">
              {zone.name}
            </h3>

            {/* Tagline */}
            <p className="text-xs italic text-text-muted mb-2">{zone.tagline}</p>

            {/* Description */}
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              {zone.desc}
            </p>

            {/* Features */}
            <div className="w-full space-y-3 mt-auto">
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  Console
                </span>
                <span className="text-sm font-semibold text-text">
                  {zone.console}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  Capacity
                </span>
                <span className="text-sm font-semibold text-text">
                  {zone.capacityLabel}
                </span>
              </div>

              {/* Pricing */}
              {rows.map((row) => (
                <div
                  key={row.game}
                  className="flex items-center justify-between py-2 border-t border-border"
                >
                  <span className="text-sm text-text-muted">{row.game}</span>
                  <div className="text-right">
                    <span className="text-base font-bold text-cyan">
                      {formatPrice(row.price)}
                    </span>
                    <span className="text-xs text-text-muted ml-1">
                      / {row.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
