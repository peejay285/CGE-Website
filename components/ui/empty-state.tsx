import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  /** A Lucide icon component. (Legacy string/emoji still renders, but
   *  the interface standard is real icons — no emoji chrome.) */
  icon: LucideIcon | string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {typeof Icon === "string" ? (
        <div className="text-5xl mb-4">{Icon}</div>
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-alt text-text-muted">
          <Icon size={28} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-text-muted mb-4">{subtitle}</p>}
      {/* min-h-11 keeps the tap target >=44px on touch screens; desktop
          (sm+) stays at the compact size the design expects. */}
      {action && (
        <Button
          variant="secondary"
          size="sm"
          onClick={action.onClick}
          className="min-h-11 sm:min-h-0"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
