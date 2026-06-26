"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationList } from "@/components/messages/conversation-list";
import { ChatThread } from "@/components/messages/chat-thread";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import type { Conversation } from "@/lib/types";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const {
    conversations,
    activeMessages,
    loading,
    messagesLoading,
    actionLoading,
    getConversations,
    getMessages,
    sendMessage,
    subscribeToMessages,
  } = useMessages();

  const conversationId = searchParams.get("conversation");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [urlThreadDismissed, setUrlThreadDismissed] = useState(false);
  const activeConversation = useMemo(() => {
    const id = selectedConversationId ?? conversationId;
    if (!id) return null;
    return conversations.find((c) => c.id === id) ?? null;
  }, [selectedConversationId, conversationId, conversations]);
  const showThread =
    mobileShowThread ||
    Boolean(conversationId && activeConversation && !urlThreadDismissed);

  // Fetch conversations on mount
  useEffect(() => {
    if (user) {
      getConversations();
    }
  }, [user, getConversations]);

  // Load messages + subscribe when active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    getMessages(activeConversation.id);
    const cleanup = subscribeToMessages(activeConversation.id);

    return cleanup;
  }, [activeConversation, getMessages, subscribeToMessages]);

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      setSelectedConversationId(conversation.id);
      setMobileShowThread(true);
      setUrlThreadDismissed(false);
    },
    []
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeConversation) return;

      const message = await sendMessage(activeConversation.id, content);
      if (!message) {
        toast.error("Failed to send message");
      }
    },
    [activeConversation, sendMessage]
  );

  const handleBack = useCallback(() => {
    setSelectedConversationId(null);
    setMobileShowThread(false);
    setUrlThreadDismissed(true);
    // Re-fetch conversations to update last message / unread counts
    if (user) getConversations();
  }, [user, getConversations]);

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <EmptyState
          icon="🔒"
          title="Sign in to view messages"
          subtitle="You need to be signed in to chat with other gamers"
          action={{
            label: "Sign In",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("open-auth-modal"));
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={20} className="text-cyan" />
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-text">
            Messages
          </h1>
        </div>

        {/* Split layout */}
        <div className="flex gap-0 lg:gap-4 h-[calc(100vh-180px)] min-h-[400px]">
          {/* Conversation list — hidden on mobile when thread is active */}
          <div
            className={`w-full lg:w-80 lg:shrink-0 border border-border rounded-xl bg-surface overflow-hidden ${
              showThread ? "hidden lg:flex lg:flex-col" : "flex flex-col"
            }`}
          >
            <div className="p-3 border-b border-border shrink-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Conversations
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                loading={loading}
                activeId={activeConversation?.id ?? null}
                currentUserId={user?.id ?? ""}
                onSelect={handleSelectConversation}
              />
            </div>
          </div>

          {/* Chat thread — hidden on mobile when list is shown */}
          <div
            className={`flex-1 border border-border rounded-xl bg-surface overflow-hidden ${
              showThread
                ? "flex flex-col"
                : "hidden lg:flex lg:flex-col"
            }`}
          >
            {activeConversation ? (
              <ChatThread
                conversation={activeConversation}
                messages={activeMessages}
                loading={messagesLoading}
                currentUserId={user?.id ?? ""}
                onSendMessage={handleSendMessage}
                sendLoading={actionLoading}
                onBack={handleBack}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  icon="💬"
                  title="Select a conversation"
                  subtitle="Choose a conversation from the list to start chatting"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
