"use client";

import { useState } from "react";
import { Loader2, Trophy, Video, Users, CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOURNAMENT_GAMES, TOURNAMENT_FORMATS, TOURNAMENT_PLATFORMS } from "@/lib/constants";

const BRACKET_TYPES = [
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
  { value: "round_robin", label: "Round Robin" },
  { value: "swiss", label: "Swiss System" },
];

interface CreateTournamentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    title: string;
    game: string;
    date: string;
    time: string;
    entry_fee: number;
    prize: string;
    slots: number;
    format: string;
    platform: string;
    rules?: string;
    bracket_type?: string;
    team_size?: number;
    check_in_required?: boolean;
    check_in_opens_minutes?: number;
    stream_url?: string;
    description?: string;
  }) => void;
  loading?: boolean;
}

export function CreateTournamentModal({ open, onClose, onSubmit, loading }: CreateTournamentModalProps) {
  // Basic fields
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

  // New fields
  const [bracketType, setBracketType] = useState("single_elimination");
  const [teamSize, setTeamSize] = useState("1");
  const [checkInRequired, setCheckInRequired] = useState(true);
  const [checkInMinutes, setCheckInMinutes] = useState("30");
  const [streamUrl, setStreamUrl] = useState("");
  const [description, setDescription] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const showCustomGame = game === "Other";
  const resolvedGame = showCustomGame ? customGame.trim() : game;
  const isTeamTournament = Number(teamSize) > 1;

  const gameOptions = [
    ...TOURNAMENT_GAMES.map((g) => ({ value: g, label: g })),
    { value: "Other", label: "Other (custom)" },
  ];

  const formatOptions = TOURNAMENT_FORMATS.map((f) => ({ value: f, label: f }));
  const platformOptions = TOURNAMENT_PLATFORMS.map((p) => ({ value: p, label: p }));

  const today = new Date().toISOString().split("T")[0];

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

  function resetForm() {
    setTitle("");
    setGame("");
    setCustomGame("");
    setDate("");
    setTime("");
    setEntryFee("");
    setPrize("");
    setSlots("");
    setFormat("");
    setPlatform("");
    setRules("");
    setBracketType("single_elimination");
    setTeamSize("1");
    setCheckInRequired(true);
    setCheckInMinutes("30");
    setStreamUrl("");
    setDescription("");
    setShowAdvanced(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit() {
    if (!isValid || !onSubmit) return;
    onSubmit({
      title: title.trim(),
      game: resolvedGame,
      date,
      time,
      entry_fee: Number(entryFee) || 0,
      prize: prize.trim(),
      slots: Number(slots),
      format,
      platform,
      rules: rules.trim() || undefined,
      bracket_type: bracketType,
      team_size: Number(teamSize) || 1,
      check_in_required: checkInRequired,
      check_in_opens_minutes: Number(checkInMinutes) || 30,
      stream_url: streamUrl.trim() || undefined,
      description: description.trim() || undefined,
    });
  }

  const content = (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <Input
        label="Tournament Title"
        placeholder="e.g. CGE Tekken 8 Championship"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
      />

      {/* Description */}
      <Textarea
        label="Description (optional)"
        placeholder="What makes this tournament special? Describe the event..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        rows={2}
      />

      {/* Game */}
      <div>
        <Select
          label="Game"
          options={gameOptions}
          value={game}
          onChange={(e) => {
            setGame(e.target.value);
            if (e.target.value !== "Other") setCustomGame("");
          }}
        />
        {showCustomGame && (
          <div className="mt-2">
            <Input
              placeholder="Enter game name"
              value={customGame}
              onChange={(e) => setCustomGame(e.target.value)}
              maxLength={50}
            />
          </div>
        )}
      </div>

      {/* Date & Time row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={today}
        />
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {/* Entry Fee & Prize row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Entry Fee (&#x20A6;)"
          type="number"
          placeholder="0 for free entry"
          value={entryFee}
          onChange={(e) => setEntryFee(e.target.value)}
          min={0}
        />
        <Input
          label="Prize Pool"
          placeholder="e.g. ₦50,000"
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Slots & Team Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Number of Slots"
          type="number"
          placeholder="Minimum 2"
          value={slots}
          onChange={(e) => setSlots(e.target.value)}
          min={2}
          max={256}
        />
        <div>
          <label className="text-[10px] uppercase tracking-widest text-text-muted font-semibold block mb-1.5">
            Team Size
          </label>
          <select
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-alt text-sm text-text focus:outline-none focus:ring-1 focus:ring-cyan/40"
          >
            <option value="1">Solo (1v1)</option>
            <option value="2">Duos (2v2)</option>
            <option value="3">Trios (3v3)</option>
            <option value="4">Quads (4v4)</option>
            <option value="5">5v5</option>
          </select>
          {isTeamTournament && (
            <p className="text-[10px] text-cyan mt-1 flex items-center gap-1">
              <Users size={10} />
              Team tournament — {teamSize} players per team
            </p>
          )}
        </div>
      </div>

      {/* Format & Platform row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Format"
          options={formatOptions}
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        />
        <Select
          label="Platform"
          options={platformOptions}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        />
      </div>

      {/* Bracket Type */}
      <Select
        label="Bracket Type"
        options={BRACKET_TYPES}
        value={bracketType}
        onChange={(e) => setBracketType(e.target.value)}
      />

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-cyan hover:text-cyan/80 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
      >
        <span className={cn("transition-transform", showAdvanced && "rotate-90")}>▸</span>
        Advanced Options
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-3 border-l-2 border-cyan/20">
          {/* Check-in */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                <CheckCircle size={13} className="text-cyan/60" />
                Require Check-in
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Players must confirm attendance before the tournament starts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={checkInRequired}
              onClick={() => setCheckInRequired(!checkInRequired)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer",
                checkInRequired ? "bg-cyan" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  checkInRequired && "translate-x-5"
                )}
              />
            </button>
          </div>

          {checkInRequired && (
            <Input
              label="Check-in Opens (minutes before start)"
              type="number"
              value={checkInMinutes}
              onChange={(e) => setCheckInMinutes(e.target.value)}
              min={5}
              max={120}
            />
          )}

          {/* Stream URL */}
          <div>
            <Input
              label="Stream URL (optional)"
              placeholder="e.g. https://twitch.tv/yourchannel"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              maxLength={500}
            />
            <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
              <Video size={10} />
              Supports Twitch, YouTube, and Kick
            </p>
          </div>
        </div>
      )}

      {/* Rules */}
      <Textarea
        label="Tournament Rules (optional)"
        placeholder={"Enter rules, one per line...\ne.g. No lag switching\nBest of 3 rounds per match\n15 min no-show = forfeit"}
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        maxLength={2000}
      />

      {/* Submit */}
      <Button
        variant="magenta"
        fullWidth
        disabled={!isValid || loading}
        onClick={handleSubmit}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Tournament...
          </>
        ) : (
          <>
            <Trophy size={16} />
            Create Tournament
          </>
        )}
      </Button>
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={handleClose} title="Host a Tournament" width="lg">
          {content}
        </Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={handleClose} title="Host a Tournament">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
    </>
  );
}
