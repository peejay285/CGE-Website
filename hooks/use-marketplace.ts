"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { escapePostgrestSearch } from "@/lib/utils";
import type { MarketplaceListing, SwapProposal, SwapAssistPayment } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ListingFilters {
  category?: string;
  search?: string;
  status?: string;
  locationState?: string;
  limit?: number;
  offset?: number;
}

interface CreateListingData {
  title: string;
  price: number;
  condition: string;
  category: string;
  description?: string;
  images?: string[];
  listing_type?: "sell" | "swap" | "sell_or_swap";
  swap_for?: string;
  swap_for_tags?: string[];
  buyout_price?: number | null;
  location?: string | null;
  location_state?: string;
  location_city?: string | null;
}

interface UpdateListingData {
  title?: string;
  price?: number;
  condition?: string;
  category?: string;
  description?: string;
  images?: string[];
  listing_type?: "sell" | "swap" | "sell_or_swap";
  swap_for?: string;
  swap_for_tags?: string[];
  buyout_price?: number | null;
  status?: "active" | "sold" | "archived";
}

const PAGE_SIZE = 20;

export function useMarketplace(filters?: ListingFilters) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const offsetRef = useRef(0);

  /* ────────────────────────────────────────
   *  GET LISTINGS (with saves join)
   * ──────────────────────────────────────── */

  const fetchListingsPage = useCallback(
    async (activeFilters?: ListingFilters, offset = 0) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const limit = activeFilters?.limit ?? PAGE_SIZE;

      let query = supabase
        .from("marketplace_listings")
        .select(
          "*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, location_state, location_city, is_id_verified, premium_tier), listing_saves(user_id)"
        )
        // Premium sellers' listings appear first; ties break on created_at.
        .order("premium_tier", { foreignTable: "seller", ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (activeFilters?.category) {
        query = query.eq("category", activeFilters.category);
      }
      if (activeFilters?.status) {
        query = query.eq("status", activeFilters.status);
      } else {
        query = query.eq("status", "active");
      }
      if (activeFilters?.search) {
        const safe = escapePostgrestSearch(activeFilters.search);
        query = query.ilike("title", `%${safe}%`);
      }
      if (activeFilters?.locationState) {
        query = query.eq("location_state", activeFilters.locationState);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mapped = (data ?? []).map((item: Record<string, unknown>) => {
        const saves = item.listing_saves as Array<{ user_id: string }> | undefined;

        return {
          ...item,
          seller: item.seller ?? undefined,
          swap_for_tags: (item.swap_for_tags as string[]) ?? [],
          buyout_price: (item.buyout_price as number) ?? null,
          views_count: (item.views_count as number) ?? 0,
          saves_count: saves?.length ?? 0,
          user_has_saved: currentUserId
            ? (saves ?? []).some((s) => s.user_id === currentUserId)
            : false,
        } as MarketplaceListing;
      });

      return { mapped, limit };
    },
    [supabase]
  );

  const getListings = useCallback(
    async (overrideFilters?: ListingFilters) => {
      try {
        setLoading(true);
        setError(null);
        offsetRef.current = 0;

        const activeFilters = overrideFilters ?? filters;
        const { mapped, limit } = await fetchListingsPage(activeFilters, 0);

        setListings(mapped);
        setHasMore(mapped.length >= limit);
        offsetRef.current = mapped.length;
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch listings";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [fetchListingsPage, filters]
  );

  const loadMore = useCallback(
    async (overrideFilters?: ListingFilters) => {
      if (loadingMore || !hasMore) return [];
      try {
        setLoadingMore(true);
        const activeFilters = overrideFilters ?? filters;
        const { mapped, limit } = await fetchListingsPage(activeFilters, offsetRef.current);

        setListings((prev) => [...prev, ...mapped]);
        setHasMore(mapped.length >= limit);
        offsetRef.current += mapped.length;
        return mapped;
      } catch {
        return [];
      } finally {
        setLoadingMore(false);
      }
    },
    [fetchListingsPage, filters, loadingMore, hasMore]
  );

  useEffect(() => {
    getListings();
  }, [getListings]);

  /* ────────────────────────────────────────
   *  GET LISTING BY ID
   * ──────────────────────────────────────── */

  const getListingById = useCallback(
    async (id: string): Promise<MarketplaceListing | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data, error: fetchError } = await supabase
          .from("marketplace_listings")
          .select(
            "*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, is_id_verified, premium_tier), listing_saves(user_id)"
          )
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const saves = data.listing_saves as Array<{ user_id: string }> | undefined;
        const {
          data: { user },
        } = await supabase.auth.getUser();

        return {
          ...data,
          seller: data.seller ?? undefined,
          swap_for_tags: (data.swap_for_tags as string[]) ?? [],
          buyout_price: (data.buyout_price as number) ?? null,
          views_count: (data.views_count as number) ?? 0,
          saves_count: saves?.length ?? 0,
          user_has_saved: user
            ? (saves ?? []).some((s: { user_id: string }) => s.user_id === user.id)
            : false,
        } as MarketplaceListing;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch listing";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  CREATE LISTING
   * ──────────────────────────────────────── */

  const createListing = useCallback(
    async (listingData: CreateListingData): Promise<MarketplaceListing | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Server-side validation
        if (listingData.price < 0) {
          throw new Error("Price cannot be negative");
        }
        if (listingData.buyout_price != null && listingData.buyout_price <= 0) {
          throw new Error("Buyout price must be positive");
        }
        if (!listingData.title.trim()) {
          throw new Error("Title is required");
        }

        const { data, error: insertError } = await supabase
          .from("marketplace_listings")
          .insert({
            ...listingData,
            user_id: user.id,
            images: listingData.images ?? [],
            listing_type: listingData.listing_type ?? "sell",
            swap_for: listingData.swap_for ?? null,
            swap_for_tags: listingData.swap_for_tags ?? [],
            buyout_price: listingData.buyout_price ?? null,
            location: listingData.location ?? null,
            location_state: listingData.location_state ?? null,
            location_city: listingData.location_city ?? null,
            status: "active",
          })
          .select("*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, is_id_verified, premium_tier)")
          .single();

        if (insertError) throw insertError;

        const listing = {
          ...data,
          seller: data.seller ?? undefined,
          swap_for_tags: (data.swap_for_tags as string[]) ?? [],
          buyout_price: (data.buyout_price as number) ?? null,
          views_count: 0,
          saves_count: 0,
          user_has_saved: false,
        } as MarketplaceListing;

        setListings((prev) => [listing, ...prev]);
        return listing;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create listing";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  UPDATE LISTING
   * ──────────────────────────────────────── */

  const updateListing = useCallback(
    async (id: string, updates: UpdateListingData): Promise<MarketplaceListing | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: updateError } = await supabase
          .from("marketplace_listings")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id)
          .select("*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, is_id_verified, premium_tier)")
          .single();

        if (updateError) throw updateError;

        const listing = {
          ...data,
          seller: data.seller ?? undefined,
          swap_for_tags: (data.swap_for_tags as string[]) ?? [],
          buyout_price: (data.buyout_price as number) ?? null,
          views_count: (data.views_count as number) ?? 0,
          saves_count: 0,
          user_has_saved: false,
        } as MarketplaceListing;

        setListings((prev) => prev.map((l) => (l.id === id ? listing : l)));
        return listing;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update listing";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  DELETE LISTING
   * ──────────────────────────────────────── */

  const deleteListing = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("marketplace_listings")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        setListings((prev) => prev.filter((l) => l.id !== id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete listing";
        setActionError(message);
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  UPLOAD IMAGE
   * ──────────────────────────────────────── */

  const uploadListingImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("marketplace-images")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("marketplace-images").getPublicUrl(fileName);

        return publicUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload image";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  TOGGLE SAVE (like/unlike pattern)
   * ──────────────────────────────────────── */

  const toggleSave = useCallback(
    async (listingId: string): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: existing } = await supabase
          .from("listing_saves")
          .select("id")
          .eq("listing_id", listingId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("listing_saves")
            .delete()
            .eq("listing_id", listingId)
            .eq("user_id", user.id);

          setListings((prev) =>
            prev.map((l) =>
              l.id === listingId
                ? { ...l, saves_count: Math.max(0, l.saves_count - 1), user_has_saved: false }
                : l
            )
          );
        } else {
          await supabase
            .from("listing_saves")
            .insert({ listing_id: listingId, user_id: user.id });

          setListings((prev) =>
            prev.map((l) =>
              l.id === listingId
                ? { ...l, saves_count: l.saves_count + 1, user_has_saved: true }
                : l
            )
          );
        }

        return true;
      } catch {
        return false;
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  RECORD VIEW (once per session per listing)
   * ──────────────────────────────────────── */

  const recordView = useCallback(
    async (listingId: string) => {
      if (viewedRef.current.has(listingId)) return;
      viewedRef.current.add(listingId);

      try {
        await supabase.rpc("increment_views", { listing_id: listingId });
        setListings((prev) =>
          prev.map((l) =>
            l.id === listingId ? { ...l, views_count: l.views_count + 1 } : l
          )
        );
      } catch {
        // Silent fail for views
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  GET MY LISTINGS (for swap proposal picker)
   * ──────────────────────────────────────── */

  const getMyListings = useCallback(async (): Promise<MarketplaceListing[]> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error: fetchError } = await supabase
        .from("marketplace_listings")
        .select("*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, is_id_verified, premium_tier)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      return (data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        seller: item.seller ?? undefined,
        swap_for_tags: (item.swap_for_tags as string[]) ?? [],
        buyout_price: (item.buyout_price as number) ?? null,
        views_count: (item.views_count as number) ?? 0,
        saves_count: 0,
        user_has_saved: false,
      })) as MarketplaceListing[];
    } catch {
      return [];
    }
  }, [supabase]);

  /* ────────────────────────────────────────
   *  SWAP PROPOSALS
   * ──────────────────────────────────────── */

  const createSwapProposal = useCallback(
    async (
      listingId: string,
      offeredListingId: string,
      message?: string
    ): Promise<SwapProposal | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: insertError } = await supabase
          .from("swap_proposals")
          .insert({
            listing_id: listingId,
            proposer_id: user.id,
            offered_listing_id: offeredListingId,
            message: message || null,
          })
          .select(
            "*, proposer:profiles!proposer_id(id, full_name, avatar_url, gamertag), offered_listing:marketplace_listings!offered_listing_id(id, title, images, condition, category, price, buyout_price)"
          )
          .single();

        if (insertError) throw insertError;

        return {
          ...data,
          proposer: data.proposer ?? undefined,
          offered_listing: data.offered_listing ?? undefined,
        } as SwapProposal;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create proposal";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getMyOutgoingProposals = useCallback(
    async (): Promise<SwapProposal[]> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error: fetchError } = await supabase
          .from("swap_proposals")
          .select(
            "*, proposer:profiles!proposer_id(id, full_name, avatar_url, gamertag), offered_listing:marketplace_listings!offered_listing_id(id, title, images, condition, category, price, buyout_price), target_listing:marketplace_listings!listing_id(id, title, images, condition, category, price, buyout_price, user_id), assist_payments:swap_assist_payments(*)",
          )
          .eq("proposer_id", user.id)
          .order("created_at", { ascending: false });
        if (fetchError) throw fetchError;
        return (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          proposer: item.proposer ?? undefined,
          offered_listing: item.offered_listing ?? undefined,
          target_listing: item.target_listing ?? undefined,
          assist_payments: item.assist_payments ?? [],
        })) as SwapProposal[];
      } catch {
        return [];
      }
    },
    [supabase],
  );

  // Incoming proposals across all of my listings (listing-owner view).
  const getMyIncomingProposals = useCallback(
    async (): Promise<SwapProposal[]> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: myListings } = await supabase
          .from("marketplace_listings")
          .select("id")
          .eq("user_id", user.id);
        const ids = (myListings ?? []).map((l: { id: string }) => l.id);
        if (ids.length === 0) return [];

        const { data, error: fetchError } = await supabase
          .from("swap_proposals")
          .select(
            "*, proposer:profiles!proposer_id(id, full_name, avatar_url, gamertag), offered_listing:marketplace_listings!offered_listing_id(id, title, images, condition, category, price, buyout_price), target_listing:marketplace_listings!listing_id(id, title, images, condition, category, price, buyout_price, user_id), assist_payments:swap_assist_payments(*)",
          )
          .in("listing_id", ids)
          .order("created_at", { ascending: false });
        if (fetchError) throw fetchError;
        return (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          proposer: item.proposer ?? undefined,
          offered_listing: item.offered_listing ?? undefined,
          target_listing: item.target_listing ?? undefined,
          assist_payments: item.assist_payments ?? [],
        })) as SwapProposal[];
      } catch {
        return [];
      }
    },
    [supabase],
  );

  const getSwapProposals = useCallback(
    async (listingId: string): Promise<SwapProposal[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("swap_proposals")
          .select(
            "*, proposer:profiles!proposer_id(id, full_name, avatar_url, gamertag), offered_listing:marketplace_listings!offered_listing_id(id, title, images, condition, category, price, buyout_price), assist_payments:swap_assist_payments(*)"
          )
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        return (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          proposer: item.proposer ?? undefined,
          offered_listing: item.offered_listing ?? undefined,
          assist_payments: item.assist_payments ?? [],
        })) as SwapProposal[];
      } catch {
        return [];
      }
    },
    [supabase]
  );

  const updateProposalStatus = useCallback(
    async (
      proposalId: string,
      status: "accepted" | "declined"
    ): Promise<boolean> => {
      try {
        setActionLoading(true);
        const { error: updateError } = await supabase.rpc(
          "set_swap_proposal_decision",
          {
            p_proposal_id: proposalId,
            p_status: status,
          }
        );

        if (updateError) throw updateError;
        return true;
      } catch {
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ─────────────────────────────────────────
   *  TIER 3 LIFECYCLE
   *
   * Either party calls markShipped / markReceived for their own side.
   * The status-keeper trigger derives the proposal's status from the
   * timestamps. Cancellation is also either-party. Dispute flags the
   * proposal for manual review.
   * ───────────────────────────────────────── */

  const markShipped = useCallback(
    async (
      proposalId: string,
      side: "proposer" | "owner",
      tracking?: string,
    ): Promise<boolean> => {
      try {
        setActionLoading(true);
        void side;
        const { error } = await supabase.rpc("mark_swap_shipped", {
          p_proposal_id: proposalId,
          p_tracking: tracking?.trim() || null,
        });
        if (error) throw error;
        return true;
      } catch {
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const markReceived = useCallback(
    async (proposalId: string, side: "proposer" | "owner"): Promise<boolean> => {
      try {
        setActionLoading(true);
        void side;
        const { error } = await supabase.rpc("mark_swap_received", {
          p_proposal_id: proposalId,
        });
        if (error) throw error;
        return true;
      } catch {
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const cancelSwap = useCallback(
    async (proposalId: string, reason?: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        const { error } = await supabase.rpc("cancel_swap_proposal", {
          p_proposal_id: proposalId,
          p_reason: reason?.trim() || null,
        });
        if (error) throw error;
        return true;
      } catch {
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const disputeSwap = useCallback(
    async (proposalId: string, reason: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        const { error } = await supabase.rpc("dispute_swap_proposal", {
          p_proposal_id: proposalId,
          p_reason: reason.trim(),
        });
        if (error) throw error;
        return true;
      } catch {
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  /* ────────────────────────────────────────
   *  CGE-ASSISTED SWAP (facilitation)
   *
   * request → both parties settle their half (pay or premium credit)
   * → active → complete. All writes go through security-definer RPCs.
   * ──────────────────────────────────────── */

  const requestSwapAssistance = useCallback(
    async (proposalId: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);
        const { error: rpcError } = await supabase.rpc("request_swap_assistance", {
          p_proposal_id: proposalId,
        });
        if (rpcError) throw rpcError;
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to request assistance");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const coverSwapAssistWithPremium = useCallback(
    async (proposalId: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);
        const { error: rpcError } = await supabase.rpc("cover_swap_assist_with_premium", {
          p_proposal_id: proposalId,
        });
        if (rpcError) throw rpcError;
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to use premium credit");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const completeSwapAssistance = useCallback(
    async (proposalId: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        const { error: rpcError } = await supabase.rpc("complete_swap_assistance", {
          p_proposal_id: proposalId,
        });
        if (rpcError) throw rpcError;
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to complete assistance");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const cancelSwapAssistance = useCallback(
    async (proposalId: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        const { error: rpcError } = await supabase.rpc("cancel_swap_assistance", {
          p_proposal_id: proposalId,
        });
        if (rpcError) throw rpcError;
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to cancel assistance");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase],
  );

  const getSwapAssistPayments = useCallback(
    async (proposalId: string): Promise<SwapAssistPayment[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("swap_assist_payments")
          .select("*")
          .eq("proposal_id", proposalId);
        if (fetchError) throw fetchError;
        return (data ?? []) as SwapAssistPayment[];
      } catch {
        return [];
      }
    },
    [supabase],
  );

  const getMyAssistCredits = useCallback(async (): Promise<number> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error: rpcError } = await supabase.rpc(
        "swap_assist_premium_credits_remaining",
        { p_user_id: user.id },
      );
      if (rpcError) throw rpcError;
      return typeof data === "number" ? data : 0;
    } catch {
      return 0;
    }
  }, [supabase]);

  // Initialize Paystack checkout for the current user's assist share.
  const initializeAssistPayment = useCallback(
    async (paymentId: string): Promise<string | null> => {
      try {
        setActionLoading(true);
        setActionError(null);
        const response = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "swap_assist",
            metadata: { assist_payment_id: paymentId },
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Failed to initialize payment");
        }
        return typeof body.authorization_url === "string" ? body.authorization_url : null;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to initialize payment");
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  /* ────────────────────────────────────────
   *  REALTIME SUBSCRIPTION
   * ──────────────────────────────────────── */

  const subscribeToListings = useCallback(
    (callback?: (listing: MarketplaceListing) => void) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel("marketplace-listings-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "marketplace_listings" },
          (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
            if (payload.eventType === "INSERT") {
              const newListing = {
                ...(payload.new as Record<string, unknown>),
                swap_for_tags: ((payload.new as Record<string, unknown>).swap_for_tags as string[]) ?? [],
                buyout_price: ((payload.new as Record<string, unknown>).buyout_price as number) ?? null,
                views_count: ((payload.new as Record<string, unknown>).views_count as number) ?? 0,
                saves_count: 0,
                user_has_saved: false,
              } as MarketplaceListing;
              setListings((prev) => [newListing, ...prev]);
              callback?.(newListing);
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as Record<string, unknown>;
              setListings((prev) =>
                prev.map((l) =>
                  l.id === updated.id
                    ? {
                        ...l,
                        ...updated,
                        swap_for_tags: (updated.swap_for_tags as string[]) ?? l.swap_for_tags,
                        buyout_price: (updated.buyout_price as number) ?? l.buyout_price,
                        views_count: (updated.views_count as number) ?? l.views_count,
                      }
                    : l
                )
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as unknown as MarketplaceListing;
              setListings((prev) => prev.filter((l) => l.id !== deleted.id));
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

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase]);

  return {
    listings,
    loading,
    loadingMore,
    hasMore,
    error,
    actionLoading,
    actionError,
    getListings,
    loadMore,
    getListingById,
    createListing,
    updateListing,
    deleteListing,
    uploadListingImage,
    toggleSave,
    recordView,
    getMyListings,
    createSwapProposal,
    getSwapProposals,
    getMyOutgoingProposals,
    getMyIncomingProposals,
    updateProposalStatus,
    markShipped,
    markReceived,
    cancelSwap,
    disputeSwap,
    requestSwapAssistance,
    coverSwapAssistWithPremium,
    completeSwapAssistance,
    cancelSwapAssistance,
    getSwapAssistPayments,
    getMyAssistCredits,
    initializeAssistPayment,
    subscribeToListings,
  };
}
