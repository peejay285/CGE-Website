"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const unreadChannelRef = useRef<RealtimeChannel | null>(null);

  const getConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error: fetchError } = await supabase
        .from("conversations")
        .select(
          "*, listing:marketplace_listings!listing_id(id, title, price, images, listing_type, status), buyer:profiles!buyer_id(id, full_name, avatar_url, gamertag), seller:profiles!seller_id(id, full_name, avatar_url, gamertag)"
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      const convIds = (data ?? []).map((c: Record<string, unknown>) => c.id as string);

      // Batch: fetch last messages for ALL conversations in 1 query
      // (ordered by created_at desc, we pick the first per conversation)
      const { data: allMessages } = convIds.length > 0
        ? await supabase
            .from("messages")
            .select(
              "*, sender:profiles!sender_id(id, full_name, avatar_url, gamertag)"
            )
            .in("conversation_id", convIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      // Build a map: conversation_id → most recent message
      const lastMsgMap = new Map<string, Record<string, unknown>>();
      for (const msg of allMessages ?? []) {
        const cid = (msg as Record<string, unknown>).conversation_id as string;
        if (!lastMsgMap.has(cid)) lastMsgMap.set(cid, msg as Record<string, unknown>);
      }

      // Batch: count unread messages per conversation in 1 query
      const { data: unreadRows } = convIds.length > 0
        ? await supabase
            .from("messages")
            .select("conversation_id")
            .in("conversation_id", convIds)
            .eq("is_read", false)
            .neq("sender_id", user.id)
        : { data: [] };

      // Build a map: conversation_id → unread count
      const unreadMap = new Map<string, number>();
      for (const row of unreadRows ?? []) {
        const cid = (row as Record<string, unknown>).conversation_id as string;
        unreadMap.set(cid, (unreadMap.get(cid) ?? 0) + 1);
      }

      const conversationsWithExtras: Conversation[] = (data ?? []).map(
        (conv: Record<string, unknown>) => {
          const lastMsg = lastMsgMap.get(conv.id as string);
          return {
            id: conv.id,
            listing_id: conv.listing_id,
            buyer_id: conv.buyer_id,
            seller_id: conv.seller_id,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            listing: conv.listing ?? undefined,
            buyer: conv.buyer ?? undefined,
            seller: conv.seller ?? undefined,
            last_message: lastMsg
              ? { ...lastMsg, sender: lastMsg.sender ?? undefined }
              : undefined,
            unread_count: unreadMap.get(conv.id as string) ?? 0,
          } as Conversation;
        }
      );

      setConversations(conversationsWithExtras);
      return conversationsWithExtras;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch conversations";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const markAsRead = useCallback(
    async (conversationId: string): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: updateError } = await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        if (updateError) throw updateError;

        // Update local unread counts
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, unread_count: 0 } : c
          )
        );

        // Update local active messages
        setActiveMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === conversationId && m.sender_id !== user.id
              ? { ...m, is_read: true }
              : m
          )
        );

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to mark messages as read";
        setError(message);
        return false;
      }
    },
    [supabase]
  );

  const getMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      try {
        setMessagesLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: fetchError } = await supabase
          .from("messages")
          .select(
            "*, sender:profiles!sender_id(id, full_name, avatar_url, gamertag)"
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        const messages = (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          sender: item.sender ?? undefined,
        })) as Message[];

        setActiveMessages(messages);

        // Mark messages as read after fetching
        await markAsRead(conversationId);

        return messages;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch messages";
        setError(message);
        return [];
      } finally {
        setMessagesLoading(false);
      }
    },
    [supabase, markAsRead]
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string
    ): Promise<Message | null> => {
      try {
        setActionLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: insertError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content,
          })
          .select(
            "*, sender:profiles!sender_id(id, full_name, avatar_url, gamertag)"
          )
          .single();

        if (insertError) throw insertError;

        const newMessage = {
          ...data,
          sender: data.sender ?? undefined,
        } as Message;

        setActiveMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        // Update the conversation's last message and updated_at locally
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  last_message: newMessage,
                  updated_at: newMessage.created_at,
                }
              : c
          )
        );

        return newMessage;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getOrCreateConversation = useCallback(
    async (
      listingId: string,
      sellerId: string
    ): Promise<Conversation | null> => {
      try {
        setActionLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Try to find an existing conversation
        const { data: existing, error: findError } = await supabase
          .from("conversations")
          .select(
            "*, listing:marketplace_listings!listing_id(id, title, price, images, listing_type, status), buyer:profiles!buyer_id(id, full_name, avatar_url, gamertag), seller:profiles!seller_id(id, full_name, avatar_url, gamertag)"
          )
          .eq("listing_id", listingId)
          .eq("buyer_id", user.id)
          .maybeSingle();

        if (findError) throw findError;

        if (existing) {
          const conversation = {
            ...existing,
            listing: existing.listing ?? undefined,
            buyer: existing.buyer ?? undefined,
            seller: existing.seller ?? undefined,
          } as Conversation;

          return conversation;
        }

        // Create a new conversation
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: sellerId,
          })
          .select(
            "*, listing:marketplace_listings!listing_id(id, title, price, images, listing_type, status), buyer:profiles!buyer_id(id, full_name, avatar_url, gamertag), seller:profiles!seller_id(id, full_name, avatar_url, gamertag)"
          )
          .single();

        if (createError) throw createError;

        const conversation = {
          ...created,
          listing: created.listing ?? undefined,
          buyer: created.buyer ?? undefined,
          seller: created.seller ?? undefined,
        } as Conversation;

        setConversations((prev) => [conversation, ...prev]);

        return conversation;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to get or create conversation";
        setError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get all conversation IDs where user is a participant
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (convError) throw convError;

      if (!convData || convData.length === 0) {
        setUnreadTotal(0);
        return 0;
      }

      const conversationIds = convData.map(
        (c: { id: string }) => c.id
      );

      // Count unread messages across all conversations
      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      if (countError) throw countError;

      const total = count ?? 0;
      setUnreadTotal(total);
      return total;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to fetch unread count";
      setError(message);
      return 0;
    }
  }, [supabase]);

  const subscribeToMessages = useCallback(
    (conversationId: string) => {
      // Clean up existing subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload: { new: Record<string, unknown> }) => {
            // Re-fetch complete message with sender info
            const { data } = await supabase
              .from("messages")
              .select(
                "*, sender:profiles!sender_id(id, full_name, avatar_url, gamertag)"
              )
              .eq("id", payload.new.id)
              .single();

            if (data) {
              const newMessage: Message = {
                ...data,
                sender: data.sender ?? undefined,
              } as Message;

              setActiveMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });

              // Update the conversation's last message locally
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conversationId
                    ? {
                        ...c,
                        last_message: newMessage,
                        updated_at: newMessage.created_at,
                      }
                    : c
                )
              );
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    },
    [supabase]
  );

  const subscribeToUnread = useCallback(() => {
    // Clean up existing unread subscription
    if (unreadChannelRef.current) {
      supabase.removeChannel(unreadChannelRef.current);
    }

    const channel = supabase
      .channel("messages-unread-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload: { new: Record<string, unknown> }) => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const newMsg = payload.new as Record<string, unknown>;

          // Only re-fetch unread count if the message is from someone else
          if (newMsg.sender_id !== user.id) {
            await getUnreadCount();
          }
        }
      )
      .subscribe();

    unreadChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      unreadChannelRef.current = null;
    };
  }, [supabase, getUnreadCount]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (unreadChannelRef.current) {
        supabase.removeChannel(unreadChannelRef.current);
        unreadChannelRef.current = null;
      }
    };
  }, [supabase]);

  return {
    conversations,
    activeMessages,
    loading,
    messagesLoading,
    error,
    actionLoading,
    unreadTotal,
    getConversations,
    getMessages,
    sendMessage,
    getOrCreateConversation,
    getUnreadCount,
    markAsRead,
    subscribeToMessages,
    subscribeToUnread,
  };
}
