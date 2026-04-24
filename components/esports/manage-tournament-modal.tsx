"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Users, Settings, Trash2, Play, CheckCircle, XCircle, GitBranch, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BracketView } from "@/components/esports/bracket-view";
import { TOURNAMENT_GAMES, TOURNAMENT_FORMATS, TOURNAMENT_PLATFORMS } from "@/lib/constants";
import { getFilledCount } from "@/lib/esports-utils";
import { useTournamentMatches } from "@/hooks/use-tournament-matches";
import type { Tournament, TournamentRegistrant } from "@/lib/types";
import type { BracketParticipant, BracketType } from "@/lib/bracket-engine";

type ManageView = "details" | "registrants" | "bracket";

interface ManageTournamentModalProps {
  tournament: (Tournament & { registration_count?: number }) | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (id: number, data: Record<string, unknown>) => Promise<unknown>;
  onDelete?: (id: number) => Promise<boolean>;
  onLoadRegistrants?: (tournamentId: number) => Promise<TournamentRegistrant[]>;
  loading?: boolean;
}

export function ManageTournamentModal({
  tournament,
  open,
  onClose,
  onUpdate,
  onDelete,
  onLoadRegistrants,
  loading,
}: ManageTournamentModalProps) {
  const [activeView, setActiveView] = useState<ManageView>("details");
  const [registrants, setRegistrants] = useState<TournamentRegistrant[]>([]);
  const [registrantsLoading, setRegistrantsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResetBracket, setConfirmResetBracket] = useState(false);

  const {
    matches,
    loading: bracketLoading,
    getMatches,
    generateAndSaveBracket,
    resetBracket,
  } = useTournamentMatches();

  // Edit form state
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [customGame, setCustomGame] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [prize, setPrize] = useState("");
  const [slots, setSlots] = useState("");
  const [format, setFormat] = useState("");
  const [platform, setPlatform] = useState("");
  const [rules, setRules] = useState("");

  // Populate form when tournament changes
  useEffect(() => {
    if (!tournament) return;
    const isKnownGame = TOURNAMENT_GAMES.includes(tournament.game as typeof TOURNAMENT_GAMES[number]);
    setTitle(tournament.title);
    setGame(isKnownGame ? tournament.game : "Other");
    setCustomGame(isKnownGame ? "" : tournament.game);
    setDate(tournament.date);
    setTime(tournament.time);
    setEntryFee(String(tournament.entry_fee));
    setPrize(tournament.prize);
    setSlots(String(tournament.slots));
    setFormat(tournament.format);
    setPlatform(tournament.platform);
    setRules(tournament.rules || "");
    setActiveView("details");
    setConfirmDelete(false);
    setConfirmResetBracket(false);
    setRegistrants([]);
  }, [tournament]);

  // Load registrants when switching to that view
  useEffect(() => {
    if (activeView === "registrants" && tournament && onLoadRegistrants) {
      setRegistrantsLoading(true);
      onLoadRegistrants(tournament.id)
        .then(setRegistrants)
        .finally(() => setRegistrantsLoading(false));
    }
  }, [activeView, tournament, onLoadRegistrants]);

  // Load matches when switching to bracket view
  useEffect(() => {
    if (activeView === "bracket" && tournament) {
      getMatches(tournament.id);
    }
  }, [activeView, tournament, getMatches]);

  const handleGenerateBracket = useCallback(async () => {
    if (!tournament || !onLoadRegistrants) return;

    const regs = await onLoadRegistrants(tournament.id);
    if (regs.length < 2) {
      toast.error("Need at least 2 registered players to generate a bracket");
      return;
    }

    const participants: BracketParticipant[] = regs.map((r, idx) => ({
      id: r.user_id,
      name: r.profile?.gamertag || r.profile?.full_name || `Player ${idx + 1}`,
      seed: idx + 1,
    }));

    const bracketType: BracketType = (tournament.bracket_type as BracketType) || "single_elimination";

    const result = await generateAndSaveBracket(tournament.id, bracketType, participants);
    if (result.length > 0) {
      toast.success(`Bracket generated! ${result.length} matches created.`);
    } else {
      toast.error("Failed to generate bracket");
    }
  }, [tournament, onLoadRegistrants, generateAndSaveBracket]);

  const handleResetBracket = useCallback(async () => {
    if (!tournament) return;
    const success = await resetBracket(tournament.id);
    if (success) {
      toast.success("Bracket reset");
      setConfirmResetBracket(false);
    } else {
      toast.error("Failed to reset bracket");
    }
  }, [tournament, resetBracket]);

  if (!tournament) return null;

  const showCustomGame = game === "Other";
  const resolvedGame = showCustomGame ? customGame.trim() : game;
  const isEditable = tournament.status === "open" || tournament.status === "full";
  const filledCount = getFilledCount(tournament);

  const gameOptions = [
    ...TOURNAMENT_GAMES.map((g) => ({ value: g, label: g })),
    { value: "Other", label: "Other (custom)" },
  ];
  const formatOptions = TOURNAMENT_FORMATS.map((f) => ({ value: f, label: f }));
  const platformOptions = TOURNAMENT_PLATFORMS.map((p) => ({ value: p, label: p }));

  const isValid =
    title.trim().length >= 3 &&
    resolvedGame.length > 0 &&
    date &&
    time &&
    prize.trim().length > 0 &&
    slots &&
    Number(slots) >= 2 &&
    format &&
    platform;

  async function handleSave() {
    if (!isValid || !onUpdate) return;
    await onUpdate(tournament!.id, {
      title: title.trim(),
      game: resolvedGame,
      date,
      time,
      entry_fee: Number(entryFee) || 0,
      prize: prize.trim(),
      slots: Number(slots),
      format,
      platform,
      rules: rules.trim() || null,
    });
  }

  async function handleStatusChange(newStatus: Tournament["status"]) {
    if (!onUpdate) return;
    await onUpdate(tournament!.id, { status: newStatus });
  }

  async function handleDelete() {
    if (!onDelete) return;
    const success = await onDelete(tournament!.id);
    if (success) onClose();
  }

  const content = (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 overflow-x-auto" role="tablist" aria-label="Tournament management tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "details"}
          onClick={() => setActiveView("details")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "details"
              ? "bg-magenta/10 text-magenta border border-magenta/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-magenta/20"
          )}
        >
          <Settings size={14} />
          Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "registrants"}
          onClick={() => setActiveView("registrants")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "registrants"
              ? "bg-cyan/10 text-cyan border border-cyan/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-cyan/20"
          )}
        >
          <Users size={14} />
          Registrants ({filledCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "bracket"}
          onClick={() => setActiveView("bracket")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "bracket"
              ? "bg-green/10 text-green border border-green/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-green/20"
          )}
        >
          <GitBranch size={14} />
          Bracket
          {matches.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green/10 text-green text-[10px] font-bold">
              {matches.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════ Details View ═══════ */}
      {activeView === "details" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Current Status:</span>
              <Badge
                color={
                  tournament.status === "open" ? "green" :
                  tournament.status === "in_progress" ? "cyan" :
                  tournament.status === "completed" ? "gold" :
                  tournament.status === "full" ? "red" : "red"
                }
                size="md"
              >
                {tournament.status === "open" ? "Open" :
                 tournament.status === "in_progress" ? "Live" :
                 tournament.status === "completed" ? "Completed" :
                 tournament.status === "full" ? "Full" : "Cancelled"}
              </Badge>
            </div>
            <span className="text-xs text-text-muted">{filledCount}/{tournament.slots} registered</span>
          </div>

          {(tournament.status === "open" || tournament.status === "full") && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={loading} onClick={() => handleStatusChange("in_progress")} className="flex-1">
                <Play size={14} /> Start Tournament
              </Button>
              <Button variant="danger" size="sm" disabled={loading} onClick={() => handleStatusChange("cancelled")}>
                <XCircle size={14} /> Cancel
              </Button>
            </div>
          )}

          {tournament.status === "in_progress" && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={loading} onClick={() => handleStatusChange("completed")} className="flex-1">
                <CheckCircle size={14} /> Complete Tournament
              </Button>
              <Button variant="danger" size="sm" disabled={loading} onClick={() => handleStatusChange("cancelled")}>
                <XCircle size={14} /> Cancel
              </Button>
            </div>
          )}

          {isEditable ? (
            <>
              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Edit Details</p>
              </div>
              <Input label="Tournament Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
              <div>
                <Select label="Game" options={gameOptions} value={game} onChange={(e) => { setGame(e.target.value); if (e.target.value !== "Other") setCustomGame(""); }} />
                {showCustomGame && <div className="mt-2"><Input placeholder="Enter game name" value={customGame} onChange={(e) => setCustomGame(e.target.value)} maxLength={50} /></div>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Entry Fee (&#x20A6;)" type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} min={0} />
                <Input label="Prize Pool" value={prize} onChange={(e) => setPrize(e.target.value)} maxLength={200} />
              </div>
              <Input label="Number of Slots" type="number" value={slots} onChange={(e) => setSlots(e.target.value)} min={2} max={256} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Format" options={formatOptions} value={format} onChange={(e) => setFormat(e.target.value)} />
                <Select label="Platform" options={platformOptions} value={platform} onChange={(e) => setPlatform(e.target.value)} />
              </div>
              <Textarea label="Tournament Rules (optional)" value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000} />
              <Button variant="magenta" fullWidth disabled={!isValid || loading} onClick={handleSave}>
                {loading ? (<><Loader2 size={16} className="animate-spin" /> Saving...</>) : "Save Changes"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">Tournament details cannot be edited after it has started or ended.</p>
          )}

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-red mb-3">Danger Zone</p>
            {!confirmDelete ? (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={loading}>
                <Trash2 size={14} /> Delete Tournament
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xs text-red flex-1">This will permanently delete the tournament. Are you sure?</p>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Registrants View ═══════ */}
      {activeView === "registrants" && (
        <div>
          {registrantsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-cyan" /></div>
          ) : registrants.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">No one has registered yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {registrants.map((registrant, index) => (
                <div key={registrant.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt border border-border">
                  <span className="text-xs font-bold text-text-muted w-5 text-center">{index + 1}</span>
                  {registrant.profile?.avatar_url ? (
                    <Image src={registrant.profile.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full shrink-0 bg-surface border border-border flex items-center justify-center">
                      <span className="text-xs font-bold text-text-muted">{(registrant.profile?.full_name || "?").charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{registrant.profile?.full_name || "Unknown Player"}</p>
                    {registrant.profile?.gamertag && <p className="text-xs text-text-muted">@{registrant.profile.gamertag}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {registrant.checked_in && <CheckCircle size={14} className="text-green" />}
                    <Badge color={registrant.payment_status === "paid" ? "green" : "gold"} size="sm">{registrant.payment_status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ Bracket View ═══════ */}
      {activeView === "bracket" && (
        <div>
          <div className="flex gap-2 mb-6">
            {matches.length === 0 && (
              <Button variant="primary" size="sm" disabled={bracketLoading || filledCount < 2} onClick={handleGenerateBracket} className="flex-1">
                {bracketLoading ? (<><Loader2 size={14} className="animate-spin" /> Generating...</>) : (<><GitBranch size={14} /> Generate Bracket</>)}
              </Button>
            )}
            {matches.length > 0 && !confirmResetBracket && (
              <Button variant="danger" size="sm" onClick={() => setConfirmResetBracket(true)} disabled={bracketLoading}>
                <RefreshCw size={14} /> Reset Bracket
              </Button>
            )}
            {matches.length > 0 && confirmResetBracket && (
              <div className="flex items-center gap-3 flex-1">
                <p className="text-xs text-red flex-1">Delete all matches and results?</p>
                <Button variant="danger" size="sm" onClick={handleResetBracket} disabled={bracketLoading}>
                  {bracketLoading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Reset"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmResetBracket(false)}>Cancel</Button>
              </div>
            )}
          </div>

          {filledCount < 2 && matches.length === 0 && (
            <p className="text-xs text-text-muted text-center mb-4">Need at least 2 registrants to generate a bracket.</p>
          )}

          {bracketLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-green" /></div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">No bracket generated yet</p>
              <p className="text-xs text-text-muted/60 mt-1">Generate a bracket to see the matchups</p>
            </div>
          ) : (
            <BracketView matches={matches} bracketType={tournament.bracket_type ?? undefined} />
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title="Manage Tournament" width="lg">{content}</Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title="Manage Tournament">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
    </>
  );
}
