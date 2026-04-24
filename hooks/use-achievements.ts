"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Achievement, PlayerAchievement } from "@/lib/types";

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // ── Get all available achievements ─────────────────
  const getAllAchievements = useCallback(async (): Promise<Achievement[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("achievements")
        .select("*")
        .order("category", { ascending: true })
        .order("rarity", { ascending: true });

      if (fetchError) throw fetchError;

      const result = (data ?? []) as Achievement[];
      setAchievements(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch achievements";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Get achievements for a specific user ───────────
  const getPlayerAchievements = useCallback(
    async (userId?: string): Promise<PlayerAchievement[]> => {
      try {
        setLoading(true);
        setError(null);

        let targetUserId = userId;
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");
          targetUserId = user.id;
        }

        const { data, error: fetchError } = await supabase
          .from("player_achievements")
          .select("*, achievement:achievements(*)")
          .eq("user_id", targetUserId)
          .order("unlocked_at", { ascending: false });

        if (fetchError) throw fetchError;

        const result = (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          achievement: item.achievement ?? undefined,
        })) as PlayerAchievement[];

        setPlayerAchievements(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch player achievements";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Check and award an achievement ─────────────────
  const awardAchievement = useCallback(
    async (
      achievementId: string,
      tournamentId?: number
    ): Promise<PlayerAchievement | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Check if already unlocked
        const { data: existing } = await supabase
          .from("player_achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_id", achievementId)
          .maybeSingle();

        if (existing) return null; // Already has it

        const { data, error: insertError } = await supabase
          .from("player_achievements")
          .insert({
            user_id: user.id,
            achievement_id: achievementId,
            tournament_id: tournamentId || null,
          })
          .select("*, achievement:achievements(*)")
          .single();

        if (insertError) throw insertError;

        const result = {
          ...data,
          achievement: data.achievement ?? undefined,
        } as PlayerAchievement;

        setPlayerAchievements((prev) => [result, ...prev]);

        // Increment achievement count on profile
        const { error: rpcError } = await supabase.rpc("increment_achievement_count", { user_id_input: user.id });
        if (rpcError) {
          // If RPC doesn't exist, manually update
          await supabase
            .from("profiles")
            .update({ achievement_count: (playerAchievements.length + 1) })
            .eq("id", user.id);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to award achievement";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, playerAchievements.length]
  );

  // ── Check milestones after match/tournament ────────
  const checkMilestones = useCallback(
    async (context: {
      wins?: number;
      tournaments_entered?: number;
      tournaments_won?: number;
    }): Promise<PlayerAchievement[]> => {
      try {
        const awarded: PlayerAchievement[] = [];

        // Define milestone checks
        const milestoneMap: Record<string, () => boolean> = {
          first_win: () => (context.wins ?? 0) >= 1,
          win_streak_5: () => (context.wins ?? 0) >= 5,
          win_streak_10: () => (context.wins ?? 0) >= 10,
          tournament_veteran: () => (context.tournaments_entered ?? 0) >= 10,
          tournament_warrior: () => (context.tournaments_entered ?? 0) >= 25,
          first_place: () => (context.tournaments_won ?? 0) >= 1,
          champion_x3: () => (context.tournaments_won ?? 0) >= 3,
          champion_x10: () => (context.tournaments_won ?? 0) >= 10,
        };

        for (const [achievementId, check] of Object.entries(milestoneMap)) {
          if (check()) {
            const result = await awardAchievement(achievementId);
            if (result) awarded.push(result);
          }
        }

        return awarded;
      } catch {
        return [];
      }
    },
    [awardAchievement]
  );

  // ── Calculate total achievement points for user ────
  const getTotalPoints = useCallback((): number => {
    return playerAchievements.reduce(
      (sum, pa) => sum + (pa.achievement?.points ?? 0),
      0
    );
  }, [playerAchievements]);

  // ── Get unlocked achievement IDs as a Set ──────────
  const getUnlockedIds = useCallback((): Set<string> => {
    return new Set(playerAchievements.map((pa) => pa.achievement_id));
  }, [playerAchievements]);

  return {
    achievements,
    playerAchievements,
    loading,
    error,
    getAllAchievements,
    getPlayerAchievements,
    awardAchievement,
    checkMilestones,
    getTotalPoints,
    getUnlockedIds,
  };
}
