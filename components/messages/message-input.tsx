"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  loading = false,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * 4 + 20;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, loading, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = loading || value.trim().length === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex items-end gap-2"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={loading}
        className="bg-surface-alt border border-border rounded-lg px-4 py-2.5 text-sm text-text flex-1 placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 resize-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isDisabled}
        className="bg-cyan hover:bg-cyan/80 text-base rounded-lg px-3 py-2.5 transition-colors disabled:opacity-50 shrink-0"
      >
        <SendHorizontal className="w-4 h-4" />
      </button>
    </form>
  );
}
