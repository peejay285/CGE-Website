"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FollowState {
  following: string[];
  followers: string[];
}

export function usePlayerFollows() {
  const [state, setState] = useState<FollowState>({ following: [], followers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // ── Get who the current user follows ───────────────
  const getFollowing = useCallback(async (): Promise<string[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error: fetchError } = await supabase
        .from("player_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (fetchError) throw fetchError;

      const ids = (data ?? []).map((f: { following_id: string }) => f.following_id);
      setState((prev) => ({ ...prev, following: ids }));
      return ids;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch following";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Get followers of a user ────────────────────────
  const getFollowers = useCallback(
    async (userId: string): Promise<string[]> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("player_follows")
          .select("follower_id")
          .eq("following_id", userId);

        if (fetchError) throw fetchError;

        const ids = (data ?? []).map((f: { follower_id: string }) => f.follower_id);
        setState((prev) => ({ ...prev, followers: ids }));
        return ids;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch followers";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Follow a player ────────────────────────────────
  const followPlayer = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        if (user.id === targetUserId) throw new Error("Cannot follow yourself");

        const { error: insertError } = await supabase
          .from("player_follows")
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (insertError) throw insertError;

        // Update follower/following counts (best-effort, RPCs may not exist)
        await supabase.rpc("increment_following_count", { user_id_input: user.id });
        await supabase.rpc("increment_follower_count", { user_id_input: targetUserId });

        setState((prev) => ({
          ...prev,
          following: [...prev.following, targetUserId],
        }));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to follow player";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Unfollow a player ──────────────────────────────
  const unfollowPlayer = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("player_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (deleteError) throw deleteError;

        setState((prev) => ({
          ...prev,
          following: prev.following.filter((id) => id !== targetUserId),
        }));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to unfollow player";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Check if following a player ────────────────────
  const isFollowing = useCallback(
    (targetUserId: string): boolean => {
      return state.following.includes(targetUserId);
    },
    [state.following]
  );

  return {
    following: state.following,
    followers: state.followers,
    loading,
    error,
    getFollowing,
    getFollowers,
    followPlayer,
    unfollowPlayer,
    isFollowing,
  };
}
