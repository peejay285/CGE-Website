"use client";

import { useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TOURNAMENT_GAMES } from "@/lib/constants";

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onCreate?: (data: {
    name: string;
    tag?: string;
    description?: string;
    game?: string;
  }) => Promise<unknown>;
  loading?: boolean;
}

export function CreateTeamModal({ open, onClose, onCreate, loading }: CreateTeamModalProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [game, setGame] = useState("");

  const isValid = name.trim().length >= 2 && name.trim().length <= 30;

  async function handleCreate() {
    if (!isValid || !onCreate) return;
    await onCreate({
      name: name.trim(),
      tag: tag.trim() || undefined,
      description: description.trim() || undefined,
      game: game || undefined,
    });
    setName("");
    setTag("");
    setDescription("");
    setGame("");
    onClose();
  }

  const content = (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-magenta/10 border border-magenta/20 mb-3">
          <Users size={24} className="text-magenta" />
        </div>
        <p className="text-xs text-text-muted">
          Create a team to compete in team tournaments and build your roster.
        </p>
      </div>

      <Input
        label="Team Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Lagos Legends"
        maxLength={30}
        autoFocus
      />

      <Input
        label="Team Tag (optional)"
        value={tag}
        onChange={(e) => setTag(e.target.value.toUpperCase())}
        placeholder="e.g. LGL"
        maxLength={5}
      />
      <p className="text-[10px] text-text-muted -mt-3">
        Short abbreviation shown next to player names (max 5 chars)
      </p>

      <div>
        <label className="text-[10px] uppercase tracking-widest text-text-muted font-semibold block mb-1.5">
          Primary Game (optional)
        </label>
        <select
          value={game}
          onChange={(e) => setGame(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-alt text-sm text-text focus:outline-none focus:ring-1 focus:ring-magenta/40"
        >
          <option value="">Any game</option>
          {TOURNAMENT_GAMES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <Textarea
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Tell others about your team..."
        maxLength={300}
        rows={3}
      />

      <Button
        variant="magenta"
        fullWidth
        disabled={!isValid || loading}
        onClick={handleCreate}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Team...
          </>
        ) : (
          <>
            <Users size={16} />
            Create Team
          </>
        )}
      </Button>
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title="Create Team">
          {content}
        </Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title="Create Team">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
    </>
  );
}
