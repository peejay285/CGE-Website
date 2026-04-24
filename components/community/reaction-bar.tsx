"use client";

import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import type { ReactionType, ReactionCount } from "@/lib/types";
import { REACTIONS } from "@/lib/community-constants";

interface ReactionBarProps {
  reactions: ReactionCount[];
  onToggleReaction: (type: ReactionType) => void;
  compact?: boolean;
}

export default function ReactionBar({
  reactions,
  onToggleReaction,
  compact = false,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  const activeReactions = reactions.filter((r) => r.count > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions */}
      {activeReactions.map((reaction) => {
        const config = REACTIONS.find((r) => r.type === reaction.reaction_type);
        if (!config) return null;
        return (
          <button
            key={reaction.reaction_type}
            onClick={() => onToggleReaction(reaction.reaction_type)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
              reaction.user_reacted
                ? "bg-cyan/15 border border-cyan/40 text-cyan"
                : "bg-surface-alt border border-border text-text-muted hover:border-border/80"
            }`}
            title={`${config.label} — ${reaction.count}`}
          >
            <span className="text-sm">{config.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`flex items-center justify-center ${
            compact ? "w-6 h-6" : "w-7 h-7"
          } rounded-full bg-surface-alt border border-border text-text-muted hover:text-text hover:border-border/80 transition-all`}
          title="Add reaction"
          aria-label="Add reaction"
        >
          <SmilePlus size={compact ? 12 : 14} />
        </button>

        {/* Picker dropdown */}
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50 animate-scaleIn">
            <div className="flex gap-1 bg-surface border border-border rounded-xl p-2 shadow-lg shadow-black/40">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => {
                    onToggleReaction(r.type);
                    setShowPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-alt transition-colors text-lg"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
