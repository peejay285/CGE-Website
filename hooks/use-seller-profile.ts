"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  SellerRating,
  SellerVerification,
  SellerProfile,
  MarketplaceListing,
  Profile,
} from "@/lib/types";

interface SubmitRatingData {
  seller_id: string;
  listing_id: string;
  rating: number;
  communication_rating?: number;
  condition_rating?: number;
  speed_rating?: number;
  review?: string;
  is_swap?: boolean;
}

export function useSellerProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  /* ────────────────────────────────────────
   *  GET SELLER PROFILE (full data)
   * ──────────────────────────────────────── */

  const getSellerProfile = useCallback(
    async (sellerId: string): Promise<SellerProfile | null> => {
      try {
        setLoading(true);
        setError(null);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sellerId)
          .single();

        if (profileError) throw profileError;

        // Fetch verification
        const { data: verification } = await supabase
          .from("seller_verifications")
          .select("*")
          .eq("user_id", sellerId)
          .maybeSingle();

        // Fetch ratings with reviewer info
        const { data: ratings } = await supabase
          .from("seller_ratings")
          .select(
            "*, reviewer:profiles!reviewer_id(id, full_name, avatar_url, gamertag), listing:marketplace_listings!listing_id(id, title, images)"
          )
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false })
          .limit(20);

        // Fetch active listings
        const { data: activeListings } = await supabase
          .from("marketplace_listings")
          .select(
            "*, seller:profiles!seller_id(id, full_name, avatar_url, gamertag), listing_saves(user_id)"
          )
          .eq("seller_id", sellerId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        const mappedListings = (activeListings ?? []).map(
          (item: Record<string, unknown>) => {
            const saves = item.listing_saves as
              | Array<{ user_id: string }>
              | undefined;
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
          }
        );

        const mappedRatings = (ratings ?? []).map(
          (item: Record<string, unknown>) => ({
            ...item,
            reviewer: item.reviewer ?? undefined,
            listing: item.listing ?? undefined,
          })
        ) as SellerRating[];

        const sellerProfile: SellerProfile = {
          ...(profile as Profile),
          verification: (verification as SellerVerification) ?? undefined,
          ratings: mappedRatings,
          stats: {
            total_listings: profile.total_listings ?? 0,
            total_sales: profile.total_sales ?? 0,
            total_swaps: profile.total_swaps ?? 0,
            avg_rating: Number(profile.avg_rating ?? 0),
            rating_count: profile.rating_count ?? 0,
            trust_level: profile.trust_level ?? "new",
          },
          active_listings: mappedListings,
        };

        return sellerProfile;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch seller profile";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  GET SELLER RATINGS (paginated)
   * ──────────────────────────────────────── */

  const getSellerRatings = useCallback(
    async (
      sellerId: string,
      limit = 10,
      offset = 0
    ): Promise<SellerRating[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("seller_ratings")
          .select(
            "*, reviewer:profiles!reviewer_id(id, full_name, avatar_url, gamertag), listing:marketplace_listings!listing_id(id, title, images)"
          )
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (fetchError) throw fetchError;

        return (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          reviewer: item.reviewer ?? undefined,
          listing: item.listing ?? undefined,
        })) as SellerRating[];
      } catch {
        return [];
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  SUBMIT A RATING
   * ──────────────────────────────────────── */

  const submitRating = useCallback(
    async (data: SubmitRatingData): Promise<SellerRating | null> => {
      try {
        setActionLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Check if user has already reviewed this listing
        const { data: existing } = await supabase
          .from("seller_ratings")
          .select("id")
          .eq("listing_id", data.listing_id)
          .eq("reviewer_id", user.id)
          .maybeSingle();

        if (existing) {
          throw new Error("You have already reviewed this listing");
        }

        const { data: rating, error: insertError } = await supabase
          .from("seller_ratings")
          .insert({
            seller_id: data.seller_id,
            reviewer_id: user.id,
            listing_id: data.listing_id,
            rating: data.rating,
            communication_rating: data.communication_rating ?? null,
            condition_rating: data.condition_rating ?? null,
            speed_rating: data.speed_rating ?? null,
            review: data.review || null,
            is_swap: data.is_swap ?? false,
          })
          .select(
            "*, reviewer:profiles!reviewer_id(id, full_name, avatar_url, gamertag)"
          )
          .single();

        if (insertError) throw insertError;

        return {
          ...rating,
          reviewer: rating.reviewer ?? undefined,
        } as SellerRating;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to submit rating";
        setError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  CHECK IF CAN REVIEW
   * ──────────────────────────────────────── */

  const canReviewListing = useCallback(
    async (listingId: string): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: existing } = await supabase
          .from("seller_ratings")
          .select("id")
          .eq("listing_id", listingId)
          .eq("reviewer_id", user.id)
          .maybeSingle();

        return !existing;
      } catch {
        return false;
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────
   *  GET SELLER QUICK STATS (lightweight)
   * ──────────────────────────────────────── */

  const getSellerQuickStats = useCallback(
    async (
      sellerId: string
    ): Promise<{
      avg_rating: number;
      rating_count: number;
      trust_level: string;
      total_sales: number;
      total_swaps: number;
    } | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select(
            "avg_rating, rating_count, trust_level, total_sales, total_swaps"
          )
          .eq("id", sellerId)
          .single();

        if (fetchError) throw fetchError;

        return {
          avg_rating: Number(data.avg_rating ?? 0),
          rating_count: data.rating_count ?? 0,
          trust_level: data.trust_level ?? "new",
          total_sales: data.total_sales ?? 0,
          total_swaps: data.total_swaps ?? 0,
        };
      } catch {
        return null;
      }
    },
    [supabase]
  );

  return {
    loading,
    error,
    actionLoading,
    getSellerProfile,
    getSellerRatings,
    submitRating,
    canReviewListing,
    getSellerQuickStats,
  };
}
