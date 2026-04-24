"use client";

import { useMemo } from "react";
import { Trophy, Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AchievementBadge } from "./achievement-badge";
import type { Achievement, PlayerAchievement } from "@/lib/types";

interface AchievementShowcaseProps {
  achievements: Achievement[];
  playerAchievements: PlayerAchievement[];
  compact?: boolean;
  onAchievementClick?: (achievement: Achievement) => void;
}

export function AchievementShowcase({
  achievements,
  playerAchievements,
  compact = false,
  onAchievementClick,
}: AchievementShowcaseProps) {
  const unlockedIds = useMemo(
    () => new Set(playerAchievements.map((pa) => pa.achievement_id)),
    [playerAchievements]
  );

  const totalPoints = useMemo(
    () =>
      playerAchievements.reduce(
        (sum, pa) => sum + (pa.achievement?.points ?? 0),
        0
      ),
    [playerAchievements]
  );

  const maxPoints = useMemo(
    () => achievements.reduce((sum, a) => sum + a.points, 0),
    [achievements]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, Achievement[]> = {};
    for (const a of achievements) {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    }
    return groups;
  }, [achievements]);

  const categoryLabels: Record<string, string> = {
    general: "General",
    tournament: "Tournament",
    social: "Social",
    milestone: "Milestone",
  };

  if (achievements.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy size={28} className="mx-auto text-text-muted/30 mb-2" />
        <p className="text-sm text-text-muted">No achievements available yet</p>
      </div>
    );
  }

  // Compact mode — just show unlocked badges in a row
  if (compact) {
    const unlocked = achievements.filter((a) => unlockedIds.has(a.id));
    if (unlocked.length === 0) {
      return (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Lock size={12} />
          <span>No achievements unlocked yet</span>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {unlocked.slice(0, 8).map((a) => (
          <AchievementBadge
            key={a.id}
            achievement={a}
            unlocked
            size="sm"
            onClick={onAchievementClick ? () => onAchievementClick(a) : undefined}
          />
        ))}
        {unlocked.length > 8 && (
          <span className="text-xs text-text-muted self-center">
            +{unlocked.length - 8} more
          </span>
        )}
      </div>
    );
  }

  // Full showcase
  return (
    <div className="space-y-6">
      {/* Points summary */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-gold" />
            <span className="text-sm font-bold font-heading text-text">
              Achievement Points
            </span>
          </div>
          <span className="text-sm font-bold font-heading text-gold">
            {totalPoints}/{maxPoints}
          </span>
        </div>
        <ProgressBar
          value={totalPoints}
          max={maxPoints || 1}
          color="var(--color-gold)"
        />
        <p className="text-[10px] text-text-muted mt-1.5">
          {unlockedIds.size}/{achievements.length} achievements unlocked
        </p>
      </div>

      {/* Grouped by category */}
      {Object.entries(grouped).map(([category, categoryAchievements]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            {categoryLabels[category] || category}
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
            {categoryAchievements
              .sort((a, b) => {
                // Show unlocked first, then by rarity
                const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
                const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
                if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
                const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
                return rarityOrder[a.rarity] - rarityOrder[b.rarity];
              })
              .map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={unlockedIds.has(achievement.id)}
                  size="md"
                  onClick={
                    onAchievementClick
                      ? () => onAchievementClick(achievement)
                      : undefined
                  }
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
