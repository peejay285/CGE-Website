import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBracket, type BracketParticipant, type BracketType } from "@/lib/bracket-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getTournamentActorAccess } from "@/lib/tournament-operations";

const actionSchema = z.object({
  action: z.enum(["generate", "reset"]),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
      return jsonError("Invalid tournament id", 400);
    }

    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid bracket action", 400);

    const supabase = await createServerSupabaseClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Authentication required", 401);

    const admin = createServiceRoleClient();
    const { data: tournament, error: tournamentError } = await admin
      .from("tournaments")
      .select("id, team_size, bracket_type")
      .eq("id", tournamentId)
      .single();
    if (tournamentError || !tournament) {
      return jsonError("Tournament not found", 404);
    }

    const access = await getTournamentActorAccess(
      admin,
      user.id,
      tournamentId
    );
    if (!access.isAdmin && !access.isHost) {
      return jsonError("Host or admin access required", 403);
    }

    if (parsed.data.action === "reset") {
      const { error } = await admin
        .from("tournament_matches")
        .delete()
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      return NextResponse.json({ matches: [] });
    }

    const { count } = await admin
      .from("tournament_matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    if ((count ?? 0) > 0) {
      return jsonError("Reset the existing bracket before regenerating it", 409);
    }

    const isTeamEvent = Number(tournament.team_size ?? 1) > 1;
    let participants: BracketParticipant[] = [];

    if (isTeamEvent) {
      const { data: registrations, error } = await admin
        .from("tournament_team_registrations")
        .select("team_id, registered_at")
        .eq("tournament_id", tournamentId)
        .in("payment_status", ["paid", "free"])
        .order("registered_at", { ascending: true });
      if (error) throw error;

      const teamIds = (registrations ?? []).map((row) => row.team_id);
      const { data: teams } = teamIds.length
        ? await admin
            .from("teams")
            .select("id, name, tag")
            .in("id", teamIds)
        : { data: [] };
      const teamMap = new Map((teams ?? []).map((team) => [team.id, team]));
      participants = (registrations ?? []).map((registration, index) => {
        const team = teamMap.get(registration.team_id);
        return {
          id: String(registration.team_id),
          name: team?.tag
            ? `[${team.tag}] ${team.name}`
            : team?.name ?? `Team ${index + 1}`,
          seed: index + 1,
        };
      });
    } else {
      const { data: registrations, error } = await admin
        .from("tournament_registrations")
        .select("user_id, registered_at")
        .eq("tournament_id", tournamentId)
        .in("payment_status", ["paid", "free"])
        .order("registered_at", { ascending: true });
      if (error) throw error;

      const userIds = (registrations ?? []).map((row) => row.user_id);
      const { data: profiles } = userIds.length
        ? await admin
            .from("profiles")
            .select("id, full_name, gamertag")
            .in("id", userIds)
        : { data: [] };
      const profileMap = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile])
      );
      participants = (registrations ?? []).map((registration, index) => {
        const profile = profileMap.get(registration.user_id);
        return {
          id: registration.user_id,
          name:
            profile?.gamertag ||
            profile?.full_name ||
            `Player ${index + 1}`,
          seed: index + 1,
        };
      });
    }

    if (participants.length < 2) {
      return jsonError("At least two paid registrations are required", 409);
    }

    const bracketType = [
      "single_elimination",
      "double_elimination",
      "round_robin",
      "swiss",
    ].includes(tournament.bracket_type ?? "")
      ? (tournament.bracket_type as BracketType)
      : "single_elimination";
    const generated = generateBracket(bracketType, participants);
    const rows = generated.map((match) => ({
      tournament_id: tournamentId,
      round: match.round,
      match_number: match.match_number,
      bracket_position: match.bracket_position,
      participant1_id: match.participant1_id,
      participant2_id: match.participant2_id,
      participant1_name: match.participant1_name,
      participant2_name: match.participant2_name,
      participant1_seed: match.participant1_seed,
      participant2_seed: match.participant2_seed,
      status: match.status,
      winner_id: match.winner_id,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("tournament_matches")
      .insert(rows)
      .select();
    if (insertError) throw insertError;

    for (let index = 0; index < generated.length; index += 1) {
      const source = generated[index];
      const stored = inserted?.[index];
      if (!stored) continue;

      const link: Record<string, number> = {};
      if (
        source.next_match_id_ref !== null &&
        inserted?.[source.next_match_id_ref]
      ) {
        link.next_match_id = inserted[source.next_match_id_ref].id;
        if (source.next_match_slot) link.next_match_slot = source.next_match_slot;
      }
      if (
        source.loser_next_match_id_ref !== null &&
        inserted?.[source.loser_next_match_id_ref]
      ) {
        link.loser_next_match_id =
          inserted[source.loser_next_match_id_ref].id;
        if (source.loser_next_match_slot) {
          link.loser_next_match_slot = source.loser_next_match_slot;
        }
      }
      if (Object.keys(link).length) {
        const { error } = await admin
          .from("tournament_matches")
          .update(link)
          .eq("id", stored.id);
        if (error) throw error;
      }
    }

    const { data: matches, error: fetchError } = await admin
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("match_number", { ascending: true });
    if (fetchError) throw fetchError;

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[tournaments/bracket] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Failed to update tournament bracket", 500);
  }
}
