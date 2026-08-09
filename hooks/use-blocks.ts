"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

/**
 * Cross-instance sync: several components mount their own useBlocks()
 * (conversation list filter, chat thread menu, ...). After a block/unblock
 * succeeds we broadcast this event so every instance refetches and agrees.
 */
const BLOCKS_CHANGED_EVENT = "cge:blocks-changed";

/**
 * The signed-in user's block list (`user_blocks` in
 * safety-controls-migration.sql). block()/unblock() update optimistically,
 * then persist; the DB-side message trigger enforces blocks either way.
 */
export function useBlocks() {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBlocks = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBlockedIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      if (error) throw error;
      setBlockedIds(
        new Set((data ?? []).map((row: { blocked_id: string }) => row.blocked_id))
      );
    } catch {
      // Table may not exist yet (unapplied migration) — behave as "no blocks".
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchBlocks();
    const onChanged = () => void fetchBlocks();
    window.addEventListener(BLOCKS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(BLOCKS_CHANGED_EVENT, onChanged);
  }, [fetchBlocks]);

  const isBlocked = useCallback(
    (id: string) => blockedIds.has(id),
    [blockedIds]
  );

  const block = useCallback(
    async (id: string): Promise<boolean> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id === id) return false;

      // Optimistic add
      setBlockedIds((prev) => new Set(prev).add(id));

      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: user.id, blocked_id: id });

      // 23505 = already blocked — treat as success.
      if (error && error.code !== "23505") {
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.error("Failed to block user");
        return false;
      }

      toast.success("User blocked — they can no longer message you");
      window.dispatchEvent(new CustomEvent(BLOCKS_CHANGED_EVENT));
      return true;
    },
    [supabase]
  );

  const unblock = useCallback(
    async (id: string): Promise<boolean> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Optimistic remove
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", id);

      if (error) {
        setBlockedIds((prev) => new Set(prev).add(id));
        toast.error("Failed to unblock user");
        return false;
      }

      toast.success("User unblocked");
      window.dispatchEvent(new CustomEvent(BLOCKS_CHANGED_EVENT));
      return true;
    },
    [supabase]
  );

  return { blockedIds, isBlocked, block, unblock, loading };
}
