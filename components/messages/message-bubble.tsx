"use client";

import { timeAgo } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
}

export function MessageBubble({
  content,
  isOwn,
  timestamp,
  senderName,
}: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] ${
          isOwn
            ? "ml-auto bg-cyan/10 border border-cyan/20 rounded-xl rounded-br-sm"
            : "mr-auto bg-surface-alt border border-border rounded-xl rounded-bl-sm"
        } px-3.5 py-2.5`}
      >
        {!isOwn && senderName && (
          <p className="text-[10px] font-semibold text-cyan mb-0.5">
            {senderName}
          </p>
        )}
        <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
        <p
          className={`text-[10px] text-text-muted mt-1 ${
            isOwn ? "text-right" : "text-left"
          }`}
        >
          {timeAgo(timestamp)}
        </p>
      </div>
    </div>
  );
}
