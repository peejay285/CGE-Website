"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Team, TeamJoinRequest, TeamMember } from "@/lib/types";

interface CreateTeamData {
  name: string;
  tag?: string;
  description?: string;
  game?: string;
}

type TeamProfile = Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;

async function hydrateTeamCaptains(
  supabase: ReturnType<typeof createClient>,
  rows: Team[]
) {
  const captainIds = Array.from(new Set(rows.map((team) => team.captain_id)));
  if (captainIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, gamertag")
    .in("id", captainIds);

  const profileMap = new Map<string, TeamProfile>();
  for (const profile of (profiles ?? []) as TeamProfile[]) {
    profileMap.set(profile.id, profile);
  }

  return rows.map((team) => ({
    ...team,
    captain: profileMap.get(team.captain_id),
  }));
}

async function hydrateTeamRows(
  supabase: ReturnType<typeof createClient>,
  rows: Team[]
) {
  const withCaptains = await hydrateTeamCaptains(supabase, rows);
  const teamIds = withCaptains.map((team) => team.id);
  if (teamIds.length === 0) return withCaptains;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds);

  const memberCountMap = new Map<number, number>();
  for (const membership of (memberships ?? []) as Array<{ team_id: number }>) {
    memberCountMap.set(
      membership.team_id,
      (memberCountMap.get(membership.team_id) ?? 0) + 1
    );
  }

  return withCaptains.map((team) => ({
    ...team,
    member_count: memberCountMap.get(team.id) ?? team.member_count ?? 1,
  }));
}

async function hydrateMemberProfiles(
  supabase: ReturnType<typeof createClient>,
  rows: TeamMember[]
) {
  const userIds = Array.from(new Set(rows.map((member) => member.user_id)));
  if (userIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, gamertag")
    .in("id", userIds);

  const profileMap = new Map<string, TeamProfile>();
  for (const profile of (profiles ?? []) as TeamProfile[]) {
    profileMap.set(profile.id, profile);
  }

  return rows.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id),
  }));
}

async function hydrateJoinRequestProfiles(
  supabase: ReturnType<typeof createClient>,
  rows: TeamJoinRequest[]
) {
  const userIds = Array.from(new Set(rows.map((request) => request.user_id)));
  if (userIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, gamertag")
    .in("id", userIds);

  const profileMap = new Map<string, TeamProfile>();
  for (const profile of (profiles ?? []) as TeamProfile[]) {
    profileMap.set(profile.id, profile);
  }

  return rows.map((request) => ({
    ...request,
    profile: profileMap.get(request.user_id),
  }));
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
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
          .select("*")
          .order("created_at", { ascending: false });

        if (game) {
          query = query.eq("game", game);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const result = await hydrateTeamRows(supabase, (data ?? []) as Team[]);
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
        .select("*")
        .eq("id", membership.team_id)
        .single();

      if (fetchError) throw fetchError;

      const [team] = await hydrateTeamRows(supabase, [data as Team]);
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
          .select("*")
          .eq("id", teamId)
          .single();

        if (fetchError) throw fetchError;
        const [team] = await hydrateTeamRows(supabase, [data as Team]);
        return team ?? null;
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
          .select("*")
          .eq("team_id", teamId)
          .order("role", { ascending: true })
          .order("joined_at", { ascending: true });

        if (fetchError) throw fetchError;

        const result = await hydrateMemberProfiles(
          supabase,
          (data ?? []) as TeamMember[]
        );

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

  // ── Get pending requests for a team ─────────────────
  const getTeamJoinRequests = useCallback(
    async (teamId: number): Promise<TeamJoinRequest[]> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("team_join_requests")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        const result = await hydrateJoinRequestProfiles(
          supabase,
          (data ?? []) as TeamJoinRequest[]
        );
        setJoinRequests((prev) => [
          ...prev.filter((request) => request.team_id !== teamId),
          ...result,
        ]);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch join requests";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getMyJoinRequestForTeam = useCallback(
    async (teamId: number): Promise<TeamJoinRequest | null> => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error: fetchError } = await supabase
          .from("team_join_requests")
          .select("*")
          .eq("team_id", teamId)
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle();

        if (fetchError) throw fetchError;

        const request = data as TeamJoinRequest | null;
        setJoinRequests((prev) => {
          const withoutCurrent = prev.filter(
            (item) => !(item.team_id === teamId && item.user_id === user.id)
          );
          return request ? [...withoutCurrent, request] : withoutCurrent;
        });
        return request;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch your join request";
        setError(message);
        return null;
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

        const team = { ...(data as Team), member_count: 1 };

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

  // ── Request to join a team ─────────────────────────
  const joinTeam = useCallback(
    async (teamId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: requestError } = await supabase
          .rpc("request_team_join", {
            p_team_id: teamId,
            p_message: null,
          })
          .single();

        if (requestError) throw requestError;

        const request = data as TeamJoinRequest;
        setJoinRequests((prev) => {
          const exists = prev.some((item) => item.id === request.id);
          if (exists) {
            return prev.map((item) => (item.id === request.id ? request : item));
          }
          return [...prev, request];
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to request team access";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
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
        setTeams((prev) =>
          prev.map((team) =>
            team.id === teamId
              ? { ...team, member_count: Math.max(0, (team.member_count ?? 1) - 1) }
              : team
          )
        );
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
        setTeams((prev) =>
          prev.map((team) =>
            team.id === teamId
              ? { ...team, member_count: Math.max(0, (team.member_count ?? 1) - 1) }
              : team
          )
        );
        setMyTeam((current) =>
          current?.id === teamId
            ? { ...current, member_count: Math.max(0, (current.member_count ?? 1) - 1) }
            : current
        );
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

  // ── Join request decisions ─────────────────────────
  const approveJoinRequest = useCallback(
    async (requestId: string): Promise<TeamMember | null> => {
      try {
        setLoading(true);
        setError(null);

        const request = joinRequests.find((item) => item.id === requestId);
        const { data, error: approveError } = await supabase
          .rpc("approve_team_join_request", {
            p_request_id: requestId,
          })
          .single();

        if (approveError) throw approveError;

        const [member] = await hydrateMemberProfiles(supabase, [data as TeamMember]);
        setMembers((prev) => {
          if (prev.some((item) => item.id === member.id)) return prev;
          return [...prev, member];
        });
        setJoinRequests((prev) => prev.filter((item) => item.id !== requestId));

        const teamId = member.team_id;
        setTeams((prev) =>
          prev.map((team) =>
            team.id === teamId
              ? { ...team, member_count: (team.member_count ?? 1) + 1 }
              : team
          )
        );
        setMyTeam((current) =>
          current?.id === teamId
            ? { ...current, member_count: (current.member_count ?? 1) + 1 }
            : current
        );

        if (request) {
          setJoinRequests((prev) =>
            prev.filter(
              (item) =>
                !(
                  item.user_id === request.user_id &&
                  item.status === "pending" &&
                  item.id !== requestId
                )
            )
          );
        }

        return member;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to approve join request";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, joinRequests]
  );

  const declineJoinRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: declineError } = await supabase.rpc(
          "decline_team_join_request",
          { p_request_id: requestId }
        );

        if (declineError) throw declineError;

        setJoinRequests((prev) => prev.filter((item) => item.id !== requestId));
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to decline join request";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const cancelJoinRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: cancelError } = await supabase.rpc(
          "cancel_team_join_request",
          { p_request_id: requestId }
        );

        if (cancelError) throw cancelError;

        setJoinRequests((prev) => prev.filter((item) => item.id !== requestId));
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to cancel join request";
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

        const [team] = await hydrateTeamRows(supabase, [data as Team]);
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
        setJoinRequests((prev) => prev.filter((request) => request.team_id !== teamId));
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
    joinRequests,
    loading,
    error,
    getTeams,
    getMyTeam,
    getTeamById,
    getTeamMembers,
    getTeamJoinRequests,
    getMyJoinRequestForTeam,
    createTeam,
    joinTeam,
    leaveTeam,
    removeMember,
    approveJoinRequest,
    declineJoinRequest,
    cancelJoinRequest,
    updateMemberRole,
    updateTeam,
    deleteTeam,
  };
}
