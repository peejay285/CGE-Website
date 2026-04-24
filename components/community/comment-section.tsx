"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { cn, timeAgo, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PostComment } from "@/lib/types";

interface CommentSectionProps {
  comments: PostComment[];
  onAddComment: (text: string) => void;
  currentUserId?: string;
  onDeleteComment?: (commentId: string) => void;
}

const AVATAR_COLORS = [
  "bg-cyan/20 text-cyan",
  "bg-magenta/20 text-magenta",
  "bg-green/20 text-green",
  "bg-gold/20 text-gold",
];

function getAvatarColor(id: string): string {
  const index = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function CommentSection({
  comments,
  onAddComment,
  currentUserId,
  onDeleteComment,
}: CommentSectionProps) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (text.trim().length === 0) return;
    onAddComment(text.trim());
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {comments.map((comment) => {
            const authorName = comment.author?.full_name ?? "Anonymous";
            const initials = getInitials(authorName);
            const avatarColor = getAvatarColor(comment.author_id);
            const avatarUrl = comment.author?.avatar_url;
            const gamertag = comment.author?.gamertag;
            const isOwn = currentUserId === comment.author_id;

            return (
              <div key={comment.id} className="group flex gap-2.5">
                {/* Avatar */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={authorName}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      avatarColor
                    )}
                  >
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-text">
                      {authorName}
                    </span>
                    {gamertag && (
                      <span className="text-[10px] text-text-muted/70">
                        @{gamertag}
                      </span>
                    )}
                    <span className="text-[10px] text-text-muted">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-text/80">
                    {comment.content}
                  </p>
                </div>

                {/* Delete button (own comments only, visible on hover) */}
                {isOwn && onDeleteComment && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteComment(comment.id)}
                    aria-label="Delete comment"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-500 h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add comment input */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Write a comment"
          className="flex-1"
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={text.trim().length === 0}
          onClick={handleSubmit}
          aria-label="Post comment"
          className="shrink-0 text-cyan hover:text-cyan"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
