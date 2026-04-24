"use client";

import { useState, useRef, useEffect, memo } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Pin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Bookmark,
  Flag,
  ShieldCheck,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn, timeAgo, getInitials } from "@/lib/utils";
import type { CommunityPost, ReactionType, PostPoll } from "@/lib/types";
import { getTopicConfig } from "@/lib/community-constants";
import ReactionBar from "./reaction-bar";
import PollDisplay from "./poll-display";
import MediaEmbed from "./media-embed";

interface PostCardProps {
  post: CommunityPost;
  isOwner?: boolean;
  onLike: () => void;
  onComment: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onShowLikers?: () => void;
  onToggleReaction?: (type: ReactionType) => void;
  onToggleBookmark?: () => void;
  onReport?: () => void;
  onVotePoll?: (pollId: string, optionId: string) => void;
  onLoadPoll?: () => Promise<PostPoll | null>;
  onHashtagClick?: (tag: string) => void;
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

// Render content with @mentions and #hashtags highlighted
function renderContent(
  content: string,
  onHashtagClick?: (tag: string) => void
) {
  const parts = content.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-cyan font-medium cursor-pointer hover:underline">
          {part}
        </span>
      );
    }
    if (part.startsWith("#")) {
      return (
        <button
          key={i}
          onClick={() => onHashtagClick?.(part.slice(1))}
          className="text-magenta font-medium hover:underline"
        >
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const PostCard = memo(function PostCard({
  post,
  isOwner,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onShowLikers,
  onToggleReaction,
  onToggleBookmark,
  onReport,
  onVotePoll,
  onLoadPoll,
  onHashtagClick,
}: PostCardProps) {
  const authorName = post.author?.full_name ?? "Anonymous";
  const initials = getInitials(authorName);
  const avatarColor = getAvatarColor(post.author_id);
  const topicConfig = getTopicConfig(post.topic);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleShare() {
    const postUrl = `${window.location.origin}/community?post=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${authorName}`,
          text: post.content.slice(0, 100),
          url: postUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        setShareMessage("Copied!");
        setTimeout(() => setShareMessage(null), 2000);
      } catch {
        /* failed */
      }
    }
  }

  function handleSaveEdit() {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== post.content) onEdit?.(trimmed);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditContent(post.content);
    setIsEditing(false);
  }

  function handleConfirmDelete() {
    onDelete?.();
    setDeleteConfirm(false);
  }

  const trustBadge =
    post.author_trust_level === "power" || post.author_trust_level === "trusted";

  return (
    <Card className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {post.author?.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={authorName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                avatarColor
              )}
            >
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-text">{authorName}</p>
              {trustBadge && (
                <ShieldCheck size={12} className="text-cyan" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {post.author?.gamertag && (
                <p className="text-[11px] text-text-muted">
                  @{post.author.gamertag}
                </p>
              )}
              <span className="text-[10px] text-text-muted/60">·</span>
              <p className="text-[11px] text-text-muted">
                {timeAgo(post.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Topic badge */}
          {topicConfig && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{
                color: topicConfig.color,
                borderColor: `${topicConfig.color}40`,
                backgroundColor: `${topicConfig.color}10`,
              }}
            >
              {topicConfig.label}
            </span>
          )}

          {post.is_pinned && (
            <Badge color="gold">
              <Pin className="mr-1 h-3 w-3" />
              Pinned
            </Badge>
          )}

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Post options"
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface-alt shadow-lg">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditContent(post.content);
                        setIsEditing(true);
                        setDeleteConfirm(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text transition-colors hover:bg-cyan/10 hover:text-cyan"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteConfirm(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red transition-colors hover:bg-red/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    {onToggleBookmark && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onToggleBookmark();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text transition-colors hover:bg-cyan/10 hover:text-cyan"
                      >
                        <Bookmark
                          className={cn(
                            "h-3.5 w-3.5",
                            post.bookmarked && "fill-cyan text-cyan"
                          )}
                        />
                        {post.bookmarked ? "Unsave" : "Save"}
                      </button>
                    )}
                    {onReport && !post.is_reported && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onReport();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red transition-colors hover:bg-red/10"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </button>
                    )}
                    {post.is_reported && (
                      <div className="px-3 py-2 text-[11px] text-text-muted">
                        Already reported
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="flex items-center gap-3 rounded-lg border border-red/30 bg-red/5 px-4 py-3">
          <p className="flex-1 text-xs text-text">Delete this post?</p>
          <Button size="sm" variant="danger" onClick={handleConfirmDelete}>
            Yes
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}>
            No
          </Button>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-text/90">
            {renderContent(post.content, onHashtagClick)}
          </p>

          {/* Post image */}
          {post.image_url && (
            <img
              src={post.image_url}
              alt={`Image shared by ${authorName}`}
              className="w-full rounded-lg"
            />
          )}

          {/* Embedded media */}
          {post.embed_url && <MediaEmbed url={post.embed_url} />}

          {/* Poll */}
          {post.has_poll && post.poll && onVotePoll && (
            <PollDisplay
              poll={post.poll}
              onVote={onVotePoll}
              onLoadPoll={onLoadPoll}
              postId={post.id}
            />
          )}

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onHashtagClick?.(tag)}
                  className="flex items-center gap-0.5 text-[11px] text-magenta/80 hover:text-magenta transition-colors"
                >
                  <Hash size={10} />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reactions bar */}
      {onToggleReaction && (
        <ReactionBar
          reactions={post.reactions ?? []}
          onToggleReaction={onToggleReaction}
        />
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-5">
          {/* Like */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onLike}
              aria-label={post.user_has_liked ? "Unlike post" : "Like post"}
              className={cn(
                "flex items-center text-xs transition-colors",
                post.user_has_liked ? "text-red" : "text-text-muted hover:text-red"
              )}
            >
              <Heart
                className={cn("h-4 w-4", post.user_has_liked && "fill-red")}
              />
            </button>
            <button
              onClick={onShowLikers}
              className={cn(
                "text-xs transition-colors",
                post.user_has_liked
                  ? "text-red hover:underline"
                  : "text-text-muted hover:text-red hover:underline"
              )}
            >
              {post.likes_count}
            </button>
          </div>

          {/* Comment */}
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-cyan"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.comments_count}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-green"
          >
            <Share2 className="h-4 w-4" />
            <span>{shareMessage ?? "Share"}</span>
          </button>
        </div>

        {/* Bookmark (desktop - also in menu) */}
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            className="hidden sm:flex items-center text-text-muted hover:text-cyan transition-colors"
            aria-label={post.bookmarked ? "Unsave post" : "Save post"}
          >
            <Bookmark
              size={16}
              className={cn(post.bookmarked && "fill-cyan text-cyan")}
            />
          </button>
        )}
      </div>
    </Card>
  );
});
