"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import {
  X,
  ArrowLeftRight,
  Maximize2,
  Loader2,
} from "lucide-react";
import { MessageBubble } from "@/components/messages/message-bubble";
import { MessageInput } from "@/components/messages/message-input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { cn, formatPrice, timeAgo } from "@/lib/utils";
import { useMessages } from "@/hooks/use-messages";
import type { MarketplaceListing, Conversation, Message } from "@/lib/types";

interface MarketplaceChatPanelProps {
  open: boolean;
  onClose: () => void;
  listing: MarketplaceListing | null;
  currentUserId: string;
  /** Optional: go to full /messages page */
  onExpandToFull?: (conversationId: string) => void;
}

export function MarketplaceChatPanel({
  open,
  onClose,
  listing,
  currentUserId,
  onExpandToFull,
}: MarketplaceChatPanelProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);

  const {
    getOrCreateConversation,
    getMessages,
    sendMessage,
    subscribeToMessages,
    markAsRead,
    activeMessages,
  } = useMessages();

  /* ── Initialize conversation when panel opens ─────── */
  const initConversation = useCallback(async () => {
    if (!listing || !currentUserId) return;

    setLoading(true);

    // Get or create conversation
    const conv = await getOrCreateConversation(listing.id, listing.seller_id);
    if (!conv) {
      setLoading(false);
      return;
    }

    setConversation(conv);

    // Fetch messages
    const msgs = await getMessages(conv.id);
    setMessages(msgs);
    setLoading(false);

    // Subscribe to new messages in real-time
    if (subscriptionRef.current) {
      subscriptionRef.current();
    }
    const unsub = subscribeToMessages(conv.id);
    subscriptionRef.current = unsub;
  }, [
    listing,
    currentUserId,
    getOrCreateConversation,
    getMessages,
    subscribeToMessages,
  ]);

  useEffect(() => {
    if (open && listing) {
      initConversation();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [open, listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync with hook's activeMessages (real-time updates) ─── */
  useEffect(() => {
    if (conversation && activeMessages.length > 0) {
      setMessages(activeMessages);
    }
  }, [activeMessages, conversation]);

  /* ── Auto-scroll on new messages ─────────────────── */
  useEffect(() => {
    if (!messagesEndRef.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;
    if (isNearBottom || messages.length <= 1) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /* ── Send message ────────────────────────────────── */
  const handleSend = useCallback(
    async (content: string) => {
      if (!conversation) return;
      setSendLoading(true);
      await sendMessage(conversation.id, content);
      setSendLoading(false);
    },
    [conversation, sendMessage]
  );

  if (!listing) return null;

  const isSwap =
    listing.listing_type === "swap" ||
    listing.listing_type === "sell_or_swap";
  const listingImage =
    listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const sellerName =
    listing.seller?.full_name || listing.seller?.gamertag || "Seller";

  /* ── Chat content (shared between desktop & mobile) ── */
  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header with listing mini-card */}
      <div className="border-b border-border px-4 py-3 shrink-0">
        {/* Top: title + close */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-semibold text-text">
            Chat with {sellerName}
          </p>
          <div className="flex items-center gap-1">
            {onExpandToFull && conversation && (
              <button
                onClick={() => onExpandToFull(conversation.id)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors cursor-pointer hidden sm:flex"
                title="Open full conversation"
              >
                <Maximize2 size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors cursor-pointer hidden sm:flex"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Listing mini-card */}
        <div className="rounded-lg bg-surface-alt border border-border p-2 flex items-center gap-2.5">
          {listingImage ? (
            <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
              <ImageSkeleton
                src={listingImage}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-md bg-surface flex items-center justify-center text-sm shrink-0">
              📦
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-text truncate">
              {listing.title}
            </p>
            <p className="text-[10px] text-text-muted">
              {listing.listing_type === "swap" ? (
                <span className="text-magenta font-semibold flex items-center gap-0.5">
                  <ArrowLeftRight size={8} />
                  Swap Only
                </span>
              ) : (
                <>
                  <span className="text-cyan font-semibold">
                    {formatPrice(listing.price)}
                  </span>
                  {isSwap && (
                    <span className="text-magenta ml-1">/ swap</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={20} className="animate-spin text-cyan" />
              <p className="text-xs text-text-muted">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-text-muted mb-1">No messages yet</p>
              <p className="text-[11px] text-text-muted/60">
                Send a message to start the conversation
              </p>
            </div>
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
                  ? message.sender?.full_name ??
                    message.sender?.gamertag ??
                    undefined
                  : undefined
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <MessageInput
          onSend={handleSend}
          loading={sendLoading}
          placeholder={`Message ${sellerName}...`}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: Side panel */}
      {open && (
        <div
          className={cn(
            "hidden sm:flex fixed top-0 right-0 z-50 h-full w-96 bg-surface border-l border-border shadow-2xl flex-col",
            "animate-slideInRight"
          )}
        >
          {chatContent}
        </div>
      )}

      {/* Mobile: Bottom sheet */}
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title={`Chat with ${sellerName}`}>
          <div className="h-[75vh] flex flex-col">
            {/* Listing mini-card inside bottom sheet */}
            <div className="px-4 pb-3 border-b border-border shrink-0">
              <div className="rounded-lg bg-surface-alt border border-border p-2 flex items-center gap-2.5">
                {listingImage ? (
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                    <ImageSkeleton
                      src={listingImage}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-md bg-surface flex items-center justify-center text-sm shrink-0">
                    📦
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-text truncate">
                    {listing.title}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {listing.listing_type === "swap" ? (
                      <span className="text-magenta font-semibold">
                        Swap Only
                      </span>
                    ) : (
                      <span className="text-cyan font-semibold">
                        {formatPrice(listing.price)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
            >
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={20} className="animate-spin text-cyan" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-text-muted">
                    Send a message to start chatting
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
                        ? message.sender?.full_name ??
                          message.sender?.gamertag ??
                          undefined
                        : undefined
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 shrink-0">
              <MessageInput
                onSend={handleSend}
                loading={sendLoading}
                placeholder={`Message ${sellerName}...`}
              />
            </div>
          </div>
        </BottomSheet>
      </div>
    </>
  );
}
