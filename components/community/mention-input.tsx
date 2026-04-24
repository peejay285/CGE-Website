"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MentionUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  gamertag: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearchUsers: (query: string) => Promise<MentionUser[]>;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function MentionInput({
  value,
  onChange,
  onSearchUsers,
  placeholder,
  maxLength,
  rows = 3,
  className = "",
  onKeyDown,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const checkForMention = useCallback(
    (text: string, cursorPos: number) => {
      // Find the @ before cursor
      const beforeCursor = text.slice(0, cursorPos);
      const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);

      if (mentionMatch) {
        const query = mentionMatch[1];
        setMentionQuery(query);
        if (query.length >= 2) {
          onSearchUsers(query).then((users) => {
            setSuggestions(users);
            setShowSuggestions(users.length > 0);
            setSelectedIdx(0);
          });
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
        setMentionQuery("");
      }
    },
    [onSearchUsers]
  );

  const insertMention = (user: MentionUser) => {
    const tag = user.gamertag || user.full_name.replace(/\s+/g, "_");
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);

    // Replace @query with @gamertag
    const mentionStart = beforeCursor.lastIndexOf("@");
    const newText =
      beforeCursor.slice(0, mentionStart) + `@${tag} ` + afterCursor;

    onChange(newText);
    setShowSuggestions(false);

    // Focus back and set cursor
    setTimeout(() => {
      const newPos = mentionStart + tag.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    checkForMention(newValue, e.target.selectionStart);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (suggestions[selectedIdx]) {
          insertMention(suggestions[selectedIdx]);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={className}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-surface border border-border rounded-xl overflow-hidden shadow-lg shadow-black/40"
        >
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                idx === selectedIdx
                  ? "bg-cyan/10 text-cyan"
                  : "text-text hover:bg-surface-alt"
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan/20 flex items-center justify-center text-[10px] font-bold text-cyan">
                  {getInitials(user.full_name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{user.full_name}</p>
                {user.gamertag && (
                  <p className="text-[10px] text-text-muted">@{user.gamertag}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
