"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ArrowLeftRight,
  ExternalLink,
  MoreVertical,
  Flag,
  Ban,
} from "lucide-react";
import { MessageBubble } from "@/components/messages/message-bubble";
import { MessageInput } from "@/components/messages/message-input";
import { ReportModal } from "@/components/safety/report-modal";
import { useBlocks } from "@/hooks/use-blocks";
import { formatPrice } from "@/lib/utils";
import type { Conversation, Message } from "@/lib/types";

interface ChatThreadProps {
  conversation: Conversation;
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  onSendMessage: (content: string) => void;
  sendLoading: boolean;
  onBack?: () => void;
}

export function ChatThread({
  conversation,
  messages,
  loading,
  currentUserId,
  onSendMessage,
  sendLoading,
  onBack,
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Safety controls — overflow menu, report dialog, block state
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isBlocked, block, unblock } = useBlocks();

  // Close the overflow menu on outside click or Escape (navbar pattern).
  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!messagesEndRef.current || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    // Only auto-scroll if user is near the bottom
    if (isNearBottom || messages.length <= 1) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const listing = conversation.listing;
  const otherUser =
    conversation.buyer_id === currentUserId
      ? conversation.seller
      : conversation.buyer;
  const otherName = otherUser?.full_name || otherUser?.gamertag || "CGE Member";
  const otherUserId =
    otherUser?.id ??
    (conversation.buyer_id === currentUserId
      ? conversation.seller_id
      : conversation.buyer_id);
  const otherIsBlocked = isBlocked(otherUserId);
  const isSwap =
    listing?.listing_type === "swap" || listing?.listing_type === "sell_or_swap";
  const listingImage =
    listing?.images && listing.images.length > 0 ? listing.images[0] : null;
  const isSold = listing?.status === "sold";

  return (
    <div className="flex flex-col h-full">
      {/* Header — other user + listing info */}
      <div className="border-b border-border p-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button — mobile only */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1 -ml-1 text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Other user avatar */}
          <div className="w-9 h-9 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center text-xs font-bold text-cyan shrink-0">
            {otherName.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">
              {otherName}
            </p>
            {listing && (
              <p className="text-[10px] text-text-muted truncate flex items-center gap-1">
                {isSwap && <ArrowLeftRight size={8} />}
                {listing.title}
                {listing.listing_type !== "swap" && listing.price ? (
                  <span className="text-cyan"> · {formatPrice(listing.price)}</span>
                ) : null}
                {isSold && (
                  <span className="text-magenta"> · Sold</span>
                )}
              </p>
            )}
          </div>

          {/* Overflow menu — report / block */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Conversation options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Conversation options"
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface shadow-xl p-1.5 z-50"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-text hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
                >
                  <Flag size={16} className="text-text-muted" />
                  Report conversation
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    if (otherIsBlocked) {
                      void unblock(otherUserId);
                    } else {
                      void block(otherUserId);
                    }
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red hover:bg-red/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Ban size={16} />
                  {otherIsBlocked ? `Unblock ${otherName}` : `Block ${otherName}`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Listing card — compact */}
        {listing && (
          <div className="mt-2.5 rounded-lg bg-surface-alt border border-border p-2.5 flex items-center gap-3">
            {listingImage ? (
              <img
                src={listingImage}
                alt={listing.title}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-surface flex items-center justify-center text-lg shrink-0">
                📦
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">
                {listing.title}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {listing.listing_type === "swap" ? (
                  <span className="text-magenta font-semibold">Swap Only</span>
                ) : (
                  <>
                    <span className="text-cyan font-semibold">{formatPrice(listing.price)}</span>
                    {isSwap && <span className="text-magenta ml-1">/ swap</span>}
                  </>
                )}
                {isSold && <span className="text-magenta ml-1.5">· Sold</span>}
              </p>
            </div>
            <a
              href={`/marketplace`}
              className="text-text-muted hover:text-cyan transition-colors shrink-0"
              title="View listing"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
              <p className="text-xs text-text-muted">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-muted">
              Start the conversation — say hi!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              content={message.content}
              isOwn={message.sender_id === currentUserId}
              timestamp={message.created_at}
              senderName={
                message.sender_id !== currentUserId
                  ? message.sender?.full_name ?? message.sender?.gamertag ?? undefined
                  : undefined
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Blocked notice */}
      {otherIsBlocked && (
        <div className="border-t border-border px-3 py-2 shrink-0 bg-red/5">
          <p className="text-[11px] text-red flex items-center gap-1.5">
            <Ban size={11} className="shrink-0" />
            You&apos;ve blocked this user — unblock to message them
          </p>
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-border p-3 shrink-0">
        <MessageInput
          onSend={onSendMessage}
          loading={sendLoading}
          disabled={otherIsBlocked}
          placeholder={
            otherIsBlocked ? "You've blocked this user" : `Message ${otherName}...`
          }
        />
      </div>

      {/* Report conversation dialog */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        contextType="conversation"
        contextId={conversation.id}
        reportedUserId={otherUserId}
        reportedName={otherName}
      />
    </div>
  );
}
