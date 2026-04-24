"use client";

import { ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationSkeleton } from "@/components/messages/conversation-skeleton";
import { timeAgo, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  activeId: string | null;
  currentUserId: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  loading,
  activeId,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex flex-col">
        <ConversationSkeleton />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <EmptyState
          icon="💬"
          title="No conversations yet"
          subtitle="Start a conversation from any listing in the Swap Market"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeId;
        const otherUser =
          conversation.buyer_id === currentUserId
            ? conversation.seller
            : conversation.buyer;
        const otherName = otherUser?.full_name || otherUser?.gamertag || "CGE Member";
        const initials = otherName.slice(0, 2).toUpperCase();
        const isSwapListing =
          conversation.listing?.listing_type === "swap" ||
          conversation.listing?.listing_type === "sell_or_swap";
        const lastMessage = conversation.last_message;
        const unread = conversation.unread_count || 0;

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation)}
            className={cn(
              "flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer border-b border-border/50",
              isActive
                ? "bg-cyan/5 border-l-2 border-l-cyan"
                : "hover:bg-surface-alt"
            )}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center text-xs font-bold text-cyan shrink-0">
              {initials}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  "text-sm truncate",
                  unread > 0 ? "font-bold text-text" : "font-medium text-text"
                )}>
                  {otherName}
                </p>
                {lastMessage && (
                  <span className="text-[10px] text-text-muted shrink-0">
                    {timeAgo(lastMessage.created_at)}
                  </span>
                )}
              </div>

              {/* Listing reference */}
              <p className="text-[10px] text-text-muted truncate mt-0.5 flex items-center gap-1">
                {isSwapListing && <ArrowLeftRight size={8} />}
                {conversation.listing?.title || "Listing"}
                {conversation.listing?.listing_type !== "swap" && conversation.listing?.price ? (
                  <span className="text-cyan"> · {formatPrice(conversation.listing.price)}</span>
                ) : null}
              </p>

              {/* Last message preview */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className={cn(
                  "text-xs truncate",
                  unread > 0 ? "text-text" : "text-text-muted"
                )}>
                  {lastMessage
                    ? (lastMessage.sender_id === currentUserId ? "You: " : "") + lastMessage.content
                    : "No messages yet"}
                </p>
                {unread > 0 && (
                  <Badge color="cyan" size="sm">
                    {unread}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
