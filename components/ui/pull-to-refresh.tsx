"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollTopRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return;
      touchStartY.current = e.touches[0].clientY;
      // Check scroll position
      scrollTopRef.current = containerRef.current?.scrollTop ?? window.scrollY;
    },
    [disabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return;

      // Only pull-to-refresh when scrolled to top
      const currentScroll =
        containerRef.current?.scrollTop ?? window.scrollY;
      if (currentScroll > 5) return;

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;

      if (diff > 0 && scrollTopRef.current <= 5) {
        // Apply resistance (log curve)
        const distance = Math.min(MAX_PULL, diff * 0.5);
        setPullDistance(distance);
      }
    },
    [disabled, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || refreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD / 2);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, refreshing, pullDistance, onRefresh]);

  const reachedThreshold = pullDistance >= PULL_THRESHOLD;
  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden transition-all duration-200",
          pullDistance > 0 || refreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: refreshing ? 40 : pullDistance > 0 ? pullDistance : 0,
          transition: pullDistance > 0 ? "none" : "height 0.3s ease, opacity 0.3s ease",
        }}
      >
        {refreshing ? (
          <Loader2 size={20} className="animate-spin text-cyan" />
        ) : (
          <div
            className="flex flex-col items-center gap-1"
            style={{
              transform: `rotate(${reachedThreshold ? 180 : 0}deg)`,
              transition: "transform 0.2s ease",
            }}
          >
            <ArrowDown
              size={18}
              className={cn(
                "transition-colors",
                reachedThreshold ? "text-cyan" : "text-text-muted"
              )}
              style={{ opacity: progress }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform:
            pullDistance > 0 && !refreshing
              ? `translateY(${pullDistance * 0.3}px)`
              : "none",
          transition: pullDistance > 0 ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
