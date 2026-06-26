import type { SupabaseClient } from "@supabase/supabase-js";
import type { TournamentMatch } from "@/lib/types";

type AdminClient = SupabaseClient;

export interface TournamentActorAccess {
  isAdmin: boolean;
  isHost: boolean;
  isParticipant: boolean;
}

export function numericTeamId(value: string | null | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function winnerForScore(
  participant1Id: string | null,
  participant2Id: string | null,
  participant1Score: number,
  participant2Score: number
) {
  if (participant1Score === participant2Score) return null;
  return participant1Score > participant2Score
    ? participant1Id
    : participant2Id;
}

async function canRepresentParticipant(
  admin: AdminClient,
  userId: string,
  participantId: string | null | undefined
) {
  if (!participantId) return false;
  if (participantId === userId) return true;

  const teamId = numericTeamId(participantId);
  if (teamId === null) return false;

  const [{ data: team }, { data: membership }] = await Promise.all([
    admin
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("captain_id", userId)
      .maybeSingle(),
    admin
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return Boolean(team || membership);
}

export async function getTournamentActorAccess(
  admin: AdminClient,
  userId: string,
  tournamentId: number,
  participantIds: Array<string | null | undefined> = []
): Promise<TournamentActorAccess> {
  const [{ data: profile }, { data: tournament }, participantChecks] =
    await Promise.all([
      admin
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("tournaments")
        .select("created_by")
        .eq("id", tournamentId)
        .maybeSingle(),
      Promise.all(
        participantIds.map((participantId) =>
          canRepresentParticipant(admin, userId, participantId)
        )
      ),
    ]);

  return {
    isAdmin: Boolean(profile?.is_admin),
    isHost: tournament?.created_by === userId,
    isParticipant: participantChecks.some(Boolean),
  };
}

function participantDetails(match: TournamentMatch, participantId: string) {
  if (match.participant1_id === participantId) {
    return {
      name: match.participant1_name,
      seed: match.participant1_seed,
    };
  }
  return {
    name: match.participant2_name,
    seed: match.participant2_seed,
  };
}

export async function advanceTournamentMatch(
  admin: AdminClient,
  match: TournamentMatch,
  winnerId: string,
  loserId: string | null
) {
  if (match.next_match_id) {
    const winner = participantDetails(match, winnerId);
    const slot =
      match.next_match_slot === 1
        ? {
            participant1_id: winnerId,
            participant1_name: winner.name,
            participant1_seed: winner.seed,
          }
        : {
            participant2_id: winnerId,
            participant2_name: winner.name,
            participant2_seed: winner.seed,
          };

    const { error } = await admin
      .from("tournament_matches")
      .update(slot)
      .eq("id", match.next_match_id);
    if (error) throw error;
  }

  if (match.loser_next_match_id && loserId) {
    const loser = participantDetails(match, loserId);
    const slot =
      match.loser_next_match_slot === 1
        ? {
            participant1_id: loserId,
            participant1_name: loser.name,
            participant1_seed: loser.seed,
          }
        : {
            participant2_id: loserId,
            participant2_name: loser.name,
            participant2_seed: loser.seed,
          };

    const { error } = await admin
      .from("tournament_matches")
      .update(slot)
      .eq("id", match.loser_next_match_id);
    if (error) throw error;
  }
}
