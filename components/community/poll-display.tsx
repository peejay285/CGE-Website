"use client";

import { useState, useEffect } from "react";
import { BarChart3, Clock, CheckCircle2 } from "lucide-react";
import type { PostPoll } from "@/lib/types";

interface PollDisplayProps {
  poll: PostPoll;
  onVote: (pollId: string, optionId: string) => void;
  onLoadPoll?: () => Promise<PostPoll | null>;
  postId: string;
}

export default function PollDisplay({
  poll: initialPoll,
  onVote,
  onLoadPoll,
  postId,
}: PollDisplayProps) {
  const [poll, setPoll] = useState<PostPoll>(initialPoll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [voted, setVoted] = useState(poll.user_has_voted);

  useEffect(() => {
    setPoll(initialPoll);
    setVoted(initialPoll.user_has_voted);
  }, [initialPoll]);

  // Load fresh poll data if available
  useEffect(() => {
    if (onLoadPoll) {
      onLoadPoll().then((fresh) => {
        if (fresh) {
          setPoll(fresh);
          setVoted(fresh.user_has_voted);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const isExpired = poll.ends_at
    ? new Date(poll.ends_at).getTime() < Date.now()
    : false;
  const showResults = voted || isExpired;

  const handleVote = () => {
    if (!selectedOption || voted || isExpired) return;
    onVote(poll.id, selectedOption);
    setVoted(true);
    setPoll((prev) => ({
      ...prev,
      total_votes: prev.total_votes + 1,
      user_has_voted: true,
      options: prev.options.map((o) =>
        o.id === selectedOption
          ? { ...o, votes_count: o.votes_count + 1, user_voted: true }
          : o
      ),
    }));
  };

  const getTimeLeft = () => {
    if (!poll.ends_at) return "No end date";
    const diff = new Date(poll.ends_at).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(diff / 60000);
    return `${mins}m left`;
  };

  return (
    <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-3">
      {/* Poll question */}
      <div className="flex items-start gap-2">
        <BarChart3 size={16} className="text-cyan mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-text">{poll.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const pct =
            poll.total_votes > 0
              ? Math.round((option.votes_count / poll.total_votes) * 100)
              : 0;

          if (showResults) {
            return (
              <div key={option.id} className="relative">
                <div
                  className="absolute inset-0 rounded-lg transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: option.user_voted
                      ? "rgba(0, 240, 255, 0.15)"
                      : "rgba(255, 255, 255, 0.05)",
                  }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 rounded-lg border border-border/50">
                  <span className="text-xs text-text flex items-center gap-1.5">
                    {option.user_voted && (
                      <CheckCircle2 size={12} className="text-cyan" />
                    )}
                    {option.label}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`w-full flex items-center px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                selectedOption === option.id
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-border text-text-muted hover:border-border/80 hover:text-text"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 mr-2 shrink-0 transition-all ${
                  selectedOption === option.id
                    ? "border-cyan bg-cyan"
                    : "border-border"
                }`}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span>{poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {getTimeLeft()}
          </span>
        </div>
        {!showResults && !isExpired && (
          <button
            onClick={handleVote}
            disabled={!selectedOption}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-cyan text-base hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Vote
          </button>
        )}
      </div>
    </div>
  );
}
