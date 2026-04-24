"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/lib/types";

interface CreateTeamData {
  name: string;
  tag?: string;
  description?: string;
  game?: string;
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // ── Get all teams ──────────────────────────────────
  const getTeams = useCallback(
    async (game?: string): Promise<Team[]> => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from("teams")
          .select("*, captain:profiles!captain_id(id, full_name, avatar_url, gamertag)")
          .order("created_at", { ascending: false });

        if (game) {
          query = query.eq("game", game);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const result = (data ?? []) as Team[];
        setTeams(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch teams";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Get current user's team ────────────────────────
  const getMyTeam = useCallback(async (): Promise<Team | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user is a member of any team
      const { data: membership, error: memError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (memError) throw memError;
      if (!membership) {
        setMyTeam(null);
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from("teams")
        .select("*, captain:profiles!captain_id(id, full_name, avatar_url, gamertag)")
        .eq("id", membership.team_id)
        .single();

      if (fetchError) throw fetchError;

      const team = data as Team;
      setMyTeam(team);
      return team;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch team";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Get team by ID ─────────────────────────────────
  const getTeamById = useCallback(
    async (teamId: number): Promise<Team | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("teams")
          .select("*, captain:profiles!captain_id(id, full_name, avatar_url, gamertag)")
          .eq("id", teamId)
          .single();

        if (fetchError) throw fetchError;
        return data as Team;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch team";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Get team members ───────────────────────────────
  const getTeamMembers = useCallback(
    async (teamId: number): Promise<TeamMember[]> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("team_members")
          .select("*, profile:profiles!user_id(id, full_name, avatar_url, gamertag)")
          .eq("team_id", teamId)
          .order("role", { ascending: true })
          .order("joined_at", { ascending: true });

        if (fetchError) throw fetchError;

        const result = (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          profile: item.profile ?? undefined,
        })) as TeamMember[];

        setMembers(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch members";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Create a team ──────────────────────────────────
  const createTeam = useCallback(
    async (teamData: CreateTeamData): Promise<Team | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: insertError } = await supabase
          .from("teams")
          .insert({
            name: teamData.name.trim(),
            tag: teamData.tag?.trim() || null,
            description: teamData.description?.trim() || null,
            game: teamData.game || null,
            captain_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const team = data as Team;

        // Auto-add captain as team member
        await supabase.from("team_members").insert({
          team_id: team.id,
          user_id: user.id,
          role: "captain",
        });

        // Update user profile team_id
        await supabase
          .from("profiles")
          .update({ team_id: team.id })
          .eq("id", user.id);

        setMyTeam(team);
        setTeams((prev) => [team, ...prev]);
        return team;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create team";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Join a team ────────────────────────────────────
  const joinTeam = useCallback(
    async (teamId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: insertError } = await supabase
          .from("team_members")
          .insert({
            team_id: teamId,
            user_id: user.id,
            role: "member",
          });

        if (insertError) throw insertError;

        await supabase
          .from("profiles")
          .update({ team_id: teamId })
          .eq("id", user.id);

        await getMyTeam();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join team";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase, getMyTeam]
  );

  // ── Leave a team ───────────────────────────────────
  const leaveTeam = useCallback(
    async (teamId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        await supabase
          .from("profiles")
          .update({ team_id: null })
          .eq("id", user.id);

        setMyTeam(null);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to leave team";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Remove a member (captain only) ─────────────────
  const removeMember = useCallback(
    async (teamId: number, userId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: deleteError } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .eq("user_id", userId);

        if (deleteError) throw deleteError;

        await supabase
          .from("profiles")
          .update({ team_id: null })
          .eq("id", userId);

        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove member";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Promote/demote member ──────────────────────────
  const updateMemberRole = useCallback(
    async (
      teamId: number,
      userId: string,
      role: "captain" | "co-captain" | "member"
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: updateError } = await supabase
          .from("team_members")
          .update({ role })
          .eq("team_id", teamId)
          .eq("user_id", userId);

        if (updateError) throw updateError;

        setMembers((prev) =>
          prev.map((m) => (m.user_id === userId ? { ...m, role } : m))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update role";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Update team info ───────────────────────────────
  const updateTeam = useCallback(
    async (
      teamId: number,
      updates: Partial<Pick<Team, "name" | "tag" | "description" | "game">>
    ): Promise<Team | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: updateError } = await supabase
          .from("teams")
          .update(updates)
          .eq("id", teamId)
          .select()
          .single();

        if (updateError) throw updateError;

        const team = data as Team;
        setMyTeam(team);
        setTeams((prev) => prev.map((t) => (t.id === teamId ? team : t)));
        return team;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update team";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Delete team (captain only) ─────────────────────
  const deleteTeam = useCallback(
    async (teamId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        // Delete all members first
        await supabase.from("team_members").delete().eq("team_id", teamId);

        // Clear team_id from profiles
        await supabase
          .from("profiles")
          .update({ team_id: null })
          .eq("team_id", teamId);

        const { error: deleteError } = await supabase
          .from("teams")
          .delete()
          .eq("id", teamId);

        if (deleteError) throw deleteError;

        setMyTeam(null);
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete team";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    teams,
    myTeam,
    members,
    loading,
    error,
    getTeams,
    getMyTeam,
    getTeamById,
    getTeamMembers,
    createTeam,
    joinTeam,
    leaveTeam,
    removeMember,
    updateMemberRole,
    updateTeam,
    deleteTeam,
  };
}
