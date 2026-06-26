import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  advanceTournamentMatch,
  getTournamentActorAccess,
  winnerForScore,
} from "@/lib/tournament-operations";
import type { TournamentMatch } from "@/lib/types";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("report"),
    winner_id: z.string().min(1),
    participant1_score: z.number().int().min(0).max(999),
    participant2_score: z.number().int().min(0).max(999),
  }),
  z.object({ action: z.literal("confirm") }),
  z.object({
    action: z.literal("dispute"),
    reason: z.string().trim().min(5).max(1000),
  }),
  z.object({
    action: z.literal("resolve_dispute"),
    dispute_id: z.number().int().positive(),
    decision: z.enum(["resolved", "dismissed"]),
    resolution: z.string().trim().min(3).max(1000),
  }),
]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const matchId = Number(id);
    if (!Number.isSafeInteger(matchId) || matchId <= 0) {
      return jsonError("Invalid match id", 400);
    }

    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid match action", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Authentication required", 401);

    const admin = createServiceRoleClient();
    const { data: row, error: matchError } = await admin
      .from("tournament_matches")
      .select("*")
      .eq("id", matchId)
      .single();
    if (matchError || !row) return jsonError("Match not found", 404);

    const match = row as TournamentMatch;
    const access = await getTournamentActorAccess(
      admin,
      user.id,
      match.tournament_id,
      [match.participant1_id, match.participant2_id]
    );
    const isManager = access.isAdmin || access.isHost;
    const isActor = isManager || access.isParticipant;
    const now = new Date().toISOString();
    const body = parsed.data;

    if (body.action === "start") {
      if (!isActor) return jsonError("Not authorized for this match", 403);
      if (
        match.status !== "pending" ||
        !match.participant1_id ||
        !match.participant2_id
      ) {
        return jsonError("Match cannot be started", 409);
      }

      const { data, error } = await admin
        .from("tournament_matches")
        .update({ status: "in_progress", started_at: now })
        .eq("id", matchId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ match: data });
    }

    if (body.action === "report") {
      if (!isActor) return jsonError("Not authorized for this match", 403);
      if (!["pending", "in_progress"].includes(match.status)) {
        return jsonError("This match is not accepting a result", 409);
      }
      if (
        body.winner_id !== match.participant1_id &&
        body.winner_id !== match.participant2_id
      ) {
        return jsonError("Winner must be a match participant", 400);
      }
      if (body.participant1_score === body.participant2_score) {
        return jsonError("A completed match cannot end in a draw", 400);
      }
      const expectedWinner = winnerForScore(
        match.participant1_id,
        match.participant2_id,
        body.participant1_score,
        body.participant2_score
      );
      if (expectedWinner !== body.winner_id) {
        return jsonError("Winner does not match the submitted score", 400);
      }

      const loserId =
        match.participant1_id === body.winner_id
          ? match.participant2_id
          : match.participant1_id;
      const completed = isManager;
      const update = {
        winner_id: body.winner_id,
        loser_id: loserId,
        participant1_score: body.participant1_score,
        participant2_score: body.participant2_score,
        status: completed ? "completed" : "awaiting_confirmation",
        reported_by: user.id,
        reported_at: now,
        confirmed_by: completed ? user.id : null,
        confirmed_at: completed ? now : null,
        completed_at: completed ? now : null,
      };

      const { data, error } = await admin
        .from("tournament_matches")
        .update(update)
        .eq("id", matchId)
        .select()
        .single();
      if (error) throw error;
      if (completed) {
        await advanceTournamentMatch(admin, match, body.winner_id, loserId);
      }
      return NextResponse.json({ match: data });
    }

    if (body.action === "confirm") {
      if (!isActor) return jsonError("Not authorized for this match", 403);
      if (match.status !== "awaiting_confirmation" || !match.winner_id) {
        return jsonError("No result is awaiting confirmation", 409);
      }
      if (!isManager && match.reported_by === user.id) {
        return jsonError("The reporter cannot confirm their own result", 403);
      }

      const { data, error } = await admin
        .from("tournament_matches")
        .update({
          status: "completed",
          confirmed_by: user.id,
          confirmed_at: now,
          completed_at: now,
        })
        .eq("id", matchId)
        .select()
        .single();
      if (error) throw error;
      await advanceTournamentMatch(
        admin,
        match,
        match.winner_id,
        match.loser_id
      );
      return NextResponse.json({ match: data });
    }

    if (body.action === "dispute") {
      if (!isActor) return jsonError("Not authorized for this match", 403);
      if (!["awaiting_confirmation", "in_progress"].includes(match.status)) {
        return jsonError("This match cannot be disputed now", 409);
      }

      const { data: dispute, error: disputeError } = await admin
        .from("match_disputes")
        .insert({
          match_id: matchId,
          reported_by: user.id,
          reason: body.reason,
          evidence_urls: [],
          status: "open",
        })
        .select()
        .single();
      if (disputeError) throw disputeError;

      const { data, error } = await admin
        .from("tournament_matches")
        .update({ status: "disputed" })
        .eq("id", matchId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ match: data, dispute });
    }

    if (!isManager) {
      return jsonError("Host or admin access required", 403);
    }

    const { data: dispute, error: disputeLookupError } = await admin
      .from("match_disputes")
      .select("*")
      .eq("id", body.dispute_id)
      .eq("match_id", matchId)
      .single();
    if (disputeLookupError || !dispute) {
      return jsonError("Dispute not found", 404);
    }
    if (dispute.status !== "open") {
      return jsonError("Dispute is already closed", 409);
    }

    const { data: resolved, error: resolveError } = await admin
      .from("match_disputes")
      .update({
        status: body.decision,
        resolved_by: user.id,
        resolution: body.resolution,
        resolved_at: now,
      })
      .eq("id", body.dispute_id)
      .select()
      .single();
    if (resolveError) throw resolveError;

    const matchUpdate =
      body.decision === "resolved"
        ? {
            status: "pending",
            winner_id: null,
            loser_id: null,
            participant1_score: null,
            participant2_score: null,
            reported_by: null,
            reported_at: null,
            confirmed_by: null,
            confirmed_at: null,
            completed_at: null,
          }
        : match.winner_id
          ? {
              status: "completed",
              completed_at: match.completed_at ?? now,
            }
          : {
              status: match.started_at ? "in_progress" : "pending",
            };

    const { data, error } = await admin
      .from("tournament_matches")
      .update(matchUpdate)
      .eq("id", matchId)
      .select()
      .single();
    if (error) throw error;

    if (body.decision === "dismissed" && match.winner_id) {
      await advanceTournamentMatch(
        admin,
        match,
        match.winner_id,
        match.loser_id
      );
    }

    return NextResponse.json({ match: data, dispute: resolved });
  } catch (error) {
    console.error("[tournament-matches/action] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Failed to update match", 500);
  }
}
