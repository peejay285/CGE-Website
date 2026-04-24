import { ZONES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ZoneComparison() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ZONES.map((zone) => {
        const isVip = zone.id === "vip";

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
                  {zone.capacity} {zone.capacity === 1 ? "player" : "players"}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
