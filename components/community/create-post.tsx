"use client";

import { useState, useRef } from "react";
import {
  Send,
  ImagePlus,
  X,
  Loader2,
  BarChart3,
  Link2,
  ChevronDown,
  Plus,
  Minus,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CommunityTopic } from "@/lib/types";
import { TOPICS, POLL_DURATIONS } from "@/lib/community-constants";
import MentionInput from "./mention-input";

interface CreatePostProps {
  onSubmit: (
    content: string,
    options?: {
      imageUrl?: string | null;
      topic?: CommunityTopic;
      embedUrl?: string | null;
      pollQuestion?: string;
      pollOptions?: string[];
      pollDuration?: number;
    }
  ) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  onSearchUsers?: (query: string) => Promise<
    { id: string; full_name: string; avatar_url: string | null; gamertag: string | null }[]
  >;
  defaultTopic?: CommunityTopic;
}

const MAX_CHARACTERS = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function CreatePost({
  onSubmit,
  onUploadImage,
  onSearchUsers,
  defaultTopic,
}: CreatePostProps) {
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [topic, setTopic] = useState<CommunityTopic>(defaultTopic ?? "general");
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("24h");

  // Embed URL state
  const [embedUrl, setEmbedUrl] = useState("");
  const [showEmbed, setShowEmbed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const charactersLeft = MAX_CHARACTERS - content.length;
  const isEmpty = content.trim().length === 0 && !imageUrl;
  const isOverLimit = charactersLeft < 0;

  const pollValid =
    !showPoll ||
    (pollQuestion.trim().length > 0 &&
      pollOptions.filter((o) => o.trim().length > 0).length >= 2);

  function handleSubmit() {
    if (isEmpty || isOverLimit || isUploading || !pollValid) return;

    const durConfig = POLL_DURATIONS.find((d) => d.value === pollDuration);
    const validPollOptions = pollOptions
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    onSubmit(content.trim(), {
      imageUrl: imageUrl ?? undefined,
      topic,
      embedUrl: showEmbed && embedUrl.trim() ? embedUrl.trim() : undefined,
      pollQuestion: showPoll && pollQuestion.trim() ? pollQuestion.trim() : undefined,
      pollOptions: showPoll && validPollOptions.length >= 2 ? validPollOptions : undefined,
      pollDuration: showPoll && durConfig ? durConfig.ms : undefined,
    });

    // Reset
    setContent("");
    setImagePreview(null);
    setImageUrl(null);
    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowEmbed(false);
    setEmbedUrl("");
    setExpanded(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setImageUrl(null);

    if (onUploadImage) {
      setIsUploading(true);
      try {
        const url = await onUploadImage(file);
        if (url) {
          setImageUrl(url);
        } else {
          toast.error("Image upload failed");
          setImagePreview(null);
        }
      } catch {
        toast.error("Image upload failed");
        setImagePreview(null);
      } finally {
        setIsUploading(false);
      }
    }
  }

  function handleRemoveImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageUrl(null);
    setIsUploading(false);
  }

  const selectedTopic = TOPICS.find((t) => t.id === topic);

  return (
    <Card className="space-y-3">
      {/* Topic selector + expand */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowTopicPicker(!showTopicPicker)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-surface-alt hover:bg-surface transition-colors"
            style={{ color: selectedTopic?.color }}
          >
            {selectedTopic?.label ?? "General"}
            <ChevronDown size={10} />
          </button>

          {showTopicPicker && (
            <div className="absolute top-full left-0 mt-1 z-30 w-48 bg-surface border border-border rounded-xl shadow-lg shadow-black/40 overflow-hidden">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTopic(t.id);
                    setShowTopicPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-surface-alt ${
                    topic === t.id ? "text-cyan" : "text-text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] text-text-muted">
          Use @username to mention, #hashtag to tag
        </span>
      </div>

      {/* Main content input */}
      {onSearchUsers ? (
        <MentionInput
          value={content}
          onChange={setContent}
          onSearchUsers={onSearchUsers}
          placeholder="What's on your mind, gamer?"
          maxLength={MAX_CHARACTERS}
          rows={expanded ? 4 : 2}
          className="w-full bg-surface-alt border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 resize-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/25 outline-none"
          onKeyDown={(e) => {
            if (!expanded && content.length > 0) setExpanded(true);
          }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (!expanded && e.target.value.length > 0) setExpanded(true);
          }}
          placeholder="What's on your mind, gamer?"
          maxLength={MAX_CHARACTERS}
          rows={expanded ? 4 : 2}
          className="w-full bg-surface-alt border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 resize-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/25 outline-none"
        />
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="max-h-48 rounded-lg object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <button
            onClick={handleRemoveImage}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red text-white hover:opacity-80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Embed URL input */}
      {showEmbed && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-surface-alt border border-border rounded-lg px-3 py-1.5">
            <Link2 size={14} className="text-text-muted shrink-0" />
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="Paste YouTube or Twitch URL..."
              className="flex-1 bg-transparent text-xs text-text placeholder:text-text-muted/50 outline-none"
            />
          </div>
          <button
            onClick={() => {
              setShowEmbed(false);
              setEmbedUrl("");
            }}
            className="text-text-muted hover:text-text p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Poll builder */}
      {showPoll && (
        <div className="bg-surface-alt border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan text-xs font-medium">
              <BarChart3 size={14} />
              Poll
            </div>
            <button
              onClick={() => {
                setShowPoll(false);
                setPollQuestion("");
                setPollOptions(["", ""]);
              }}
              className="text-text-muted hover:text-text"
            >
              <X size={14} />
            </button>
          </div>

          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text placeholder:text-text-muted/50 outline-none focus:border-cyan/50"
          />

          <div className="space-y-1.5">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text placeholder:text-text-muted/50 outline-none focus:border-cyan/50"
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() =>
                      setPollOptions(pollOptions.filter((_, i) => i !== idx))
                    }
                    className="text-text-muted hover:text-red p-1"
                  >
                    <Minus size={12} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 6 && (
              <button
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="flex items-center gap-1 text-[11px] text-cyan hover:text-cyan/80 transition-colors"
              >
                <Plus size={12} />
                Add option
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">Duration:</span>
            <select
              value={pollDuration}
              onChange={(e) => setPollDuration(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] text-text outline-none"
            >
              {POLL_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-text-muted hover:text-cyan hover:bg-surface-alt transition-colors disabled:opacity-40"
            title="Add image"
          >
            <ImagePlus size={16} />
          </button>
          <button
            onClick={() => setShowEmbed(!showEmbed)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showEmbed
                ? "text-cyan bg-cyan/10"
                : "text-text-muted hover:text-cyan hover:bg-surface-alt"
            )}
            title="Add video embed"
          >
            <Link2 size={16} />
          </button>
          <button
            onClick={() => setShowPoll(!showPoll)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showPoll
                ? "text-cyan bg-cyan/10"
                : "text-text-muted hover:text-cyan hover:bg-surface-alt"
            )}
            title="Add poll"
          >
            <BarChart3 size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-[11px]",
              isOverLimit ? "text-red" : "text-text-muted"
            )}
          >
            {charactersLeft}
          </span>
          <Button
            size="sm"
            disabled={isEmpty || isOverLimit || isUploading || !pollValid}
            onClick={handleSubmit}
          >
            <Send className="h-3.5 w-3.5" />
            Post
          </Button>
        </div>
      </div>
    </Card>
  );
}
