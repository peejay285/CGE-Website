"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ArrowLeftRight, ExternalLink } from "lucide-react";
import { MessageBubble } from "@/components/messages/message-bubble";
import { MessageInput } from "@/components/messages/message-input";
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
        </div>

        {/* Listing card — compact */}
        {listing && (
          <div className="mt-2.5 rounded-lg bg-surface-alt border border-border p-2.5 flex items-center gap-3">
            {listingImage ? (
              <img
                src={listingImage}
                alt={listing.title}
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

      {/* Message input */}
      <div className="border-t border-border p-3 shrink-0">
        <MessageInput
          onSend={onSendMessage}
          loading={sendLoading}
          placeholder={`Message ${otherName}...`}
        />
      </div>
    </div>
  );
}
