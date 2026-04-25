"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { createClient } from "@/lib/supabase/client";
import { haversineKm } from "@/lib/utils";
import { trackView } from "@/components/marketplace/recently-viewed";
import { addSavedSearch } from "@/components/marketplace/saved-searches";
import type { MarketplaceListing, SwapProposal } from "@/lib/types";

/* ── Sort helpers ───────────────────────────────────────── */

export type SortOption = "newest" | "oldest" | "price_low" | "price_high";

export function sortListings(
  listings: MarketplaceListing[],
  sort: SortOption
): MarketplaceListing[] {
  const sorted = [...listings];
  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "price_low":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_high":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted;
  }
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_low", label: "Price: Low → High" },
  { value: "price_high", label: "Price: High → Low" },
];

/* Skeleton matching the enhanced listing card */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Image skeleton with shimmer */}
      <div className="aspect-[4/3] bg-surface-alt relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-surface-alt via-border/20 to-surface-alt animate-shimmer"
          style={{ backgroundSize: "200% 100%" }}
        />
      </div>
      {/* Content skeleton */}
      <div className="px-3 py-2.5 space-y-2">
        <div className="h-5 w-2/5 bg-surface-alt rounded-md" />
        <div className="h-3.5 w-4/5 bg-surface-alt rounded-md" />
        <div className="flex gap-1.5">
          <div className="h-4 w-14 bg-surface-alt rounded-md" />
          <div className="h-4 w-16 bg-surface-alt rounded-md" />
        </div>
        <div className="flex justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-surface-alt" />
            <div className="h-2.5 w-12 bg-surface-alt rounded" />
          </div>
          <div className="h-2.5 w-10 bg-surface-alt rounded" />
        </div>
      </div>
    </div>
  );
}

/* ── Hook ───────────────────────────────────────────────── */

export function useMarketplacePage() {
  /* ── State ─────────────────────────────────────────────── */

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });
  const [locationState, setLocationState] = useState("");
  const [nearMe, setNearMe] = useState(false);
  const geolocation = useGeolocation();
  const [profileLocationDefaulted, setProfileLocationDefaulted] = useState(false);
  const [selectedListing, setSelectedListing] =
    useState<MarketplaceListing | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);

  // Swap proposal state
  const [swapProposalTarget, setSwapProposalTarget] =
    useState<MarketplaceListing | null>(null);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);

  // Proposals for selected listing (seller view)
  const [proposals, setProposals] = useState<SwapProposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  // Chat panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatListing, setChatListing] = useState<MarketplaceListing | null>(
    null
  );

  // Review modal state
  const [reviewTarget, setReviewTarget] =
    useState<MarketplaceListing | null>(null);

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  /* ── External hooks ────────────────────────────────────── */

  const router = useRouter();
  const { user } = useAuth();
  const {
    listings,
    loading,
    loadingMore,
    hasMore,
    getListings,
    loadMore,
    createListing,
    updateListing,
    deleteListing,
    uploadListingImage,
    actionLoading,
    toggleSave,
    recordView,
    getMyListings,
    createSwapProposal,
    getSwapProposals,
    updateProposalStatus,
  } = useMarketplace();

  /* ── Effects ───────────────────────────────────────────── */

  // Infinite scroll observer — loads more when sentinel enters viewport
  const loadMoreFiltersRef = useRef({ debouncedSearch, category, locationState });
  loadMoreFiltersRef.current = { debouncedSearch, category, locationState };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const filters: { search?: string; category?: string; locationState?: string } = {};
          if (loadMoreFiltersRef.current.debouncedSearch)
            filters.search = loadMoreFiltersRef.current.debouncedSearch;
          if (loadMoreFiltersRef.current.category !== "All")
            filters.category = loadMoreFiltersRef.current.category;
          if (loadMoreFiltersRef.current.locationState)
            filters.locationState = loadMoreFiltersRef.current.locationState;
          loadMore(filters);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  // Fetch seller's phone from profile when user changes
  useEffect(() => {
    if (!user) {
      setSellerPhone(null);
      return;
    }

    const metaPhone = user.user_metadata?.phone;
    if (metaPhone) {
      setSellerPhone(metaPhone);
      return;
    }

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("phone, location_state")
      .eq("id", user.id)
      .single()
      .then(
        ({
          data,
        }: {
          data: { phone: string | null; location_state: string | null } | null;
        }) => {
          setSellerPhone(data?.phone || null);
          // Default the marketplace state filter to the user's profile state,
          // but only on first load — don't override an explicit user choice.
          if (data?.location_state && !profileLocationDefaulted) {
            setLocationState(data.location_state);
            setProfileLocationDefaulted(true);
          }
        },
      );
  }, [user, profileLocationDefaulted]);

  // Listen for share clipboard copy events from detail modal
  useEffect(() => {
    function handleShared() {
      toast.success("Link copied to clipboard!");
    }
    window.addEventListener("listing-shared", handleShared);
    return () => window.removeEventListener("listing-shared", handleShared);
  }, []);

  // Debounce search input — avoids hammering the API on every keystroke
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Re-fetch listings when debounced search, category, or state changes
  useEffect(() => {
    const filters: { search?: string; category?: string; locationState?: string } = {};
    if (debouncedSearch) filters.search = debouncedSearch;
    if (category !== "All") filters.category = category;
    if (locationState) filters.locationState = locationState;
    getListings(filters);
  }, [debouncedSearch, category, locationState, getListings]);

  /* ── Memoized filtered listings ────────────────────────── */

  const filteredListings = useMemo(() => {
    // When "Near me" is on and we have coords, decorate with distance and
    // override the sort to distance-asc. Listings without coords sink to the
    // bottom in unspecified order.
    const userCoords = nearMe ? geolocation.coords : null;
    const decorated = userCoords
      ? listings.map((l) => ({
          ...l,
          distance_km:
            l.location_lat != null && l.location_lng != null
              ? haversineKm(userCoords, {
                  lat: l.location_lat,
                  lng: l.location_lng,
                })
              : undefined,
        }))
      : listings;

    const sorted = userCoords
      ? [...decorated].sort((a, b) => {
          const da = a.distance_km ?? Infinity;
          const db = b.distance_km ?? Infinity;
          return da - db;
        })
      : sortListings(decorated, sort);

    return sorted.filter((listing) => {
      if (listingTypeFilter === "swap") {
        if (
          listing.listing_type !== "swap" &&
          listing.listing_type !== "sell_or_swap"
        )
          return false;
      }
      if (listingTypeFilter === "buy") {
        if (
          listing.listing_type !== "sell" &&
          listing.listing_type !== "sell_or_swap"
        )
          return false;
      }
      if (listingTypeFilter === "saved") {
        if (!listing.user_has_saved) return false;
      }

      const minPrice = priceRange.min ? Number(priceRange.min) : null;
      const maxPrice = priceRange.max ? Number(priceRange.max) : null;
      const listingPrice =
        listing.listing_type === "swap"
          ? (listing.buyout_price ?? 0)
          : listing.price;

      if (minPrice !== null && listingPrice < minPrice) return false;
      if (maxPrice !== null && listingPrice > maxPrice) return false;

      return true;
    });
  }, [listings, sort, listingTypeFilter, priceRange, nearMe, geolocation.coords]);

  /* ── Memoized listing titles (used by ListingFilters) ─── */

  const listingTitles = useMemo(() => listings.map((l) => l.title), [listings]);

  /* ── Callbacks ─────────────────────────────────────────── */

  const openAuthOrAction = useCallback(
    (action: () => void) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to continue", { icon: "🔒" });
        return;
      }
      action();
    },
    [user]
  );

  /* ── Save toggle ──────────────────────────────────────── */

  const handleToggleSave = useCallback(
    async (listingId: string) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to save listings", { icon: "🔒" });
        return;
      }

      await toggleSave(listingId);

      setSelectedListing((prev) => {
        if (!prev || prev.id !== listingId) return prev;
        return {
          ...prev,
          user_has_saved: !prev.user_has_saved,
          saves_count: prev.user_has_saved
            ? Math.max(0, prev.saves_count - 1)
            : prev.saves_count + 1,
        };
      });
    },
    [user, toggleSave]
  );

  /* ── Open listing detail + record view ────────────────── */

  const handleOpenListing = useCallback(
    async (listing: MarketplaceListing) => {
      setSelectedListing(listing);
      recordView(listing.id);
      trackView(listing.id);

      const isOwner = user && listing.seller_id === user.id;
      const acceptsSwap =
        listing.listing_type === "swap" ||
        listing.listing_type === "sell_or_swap";

      if (isOwner && acceptsSwap) {
        setProposalsLoading(true);
        const fetchedProposals = await getSwapProposals(listing.id);
        setProposals(fetchedProposals);
        setProposalsLoading(false);
      } else {
        setProposals([]);
      }
    },
    [user, recordView, getSwapProposals]
  );

  /* ── Create listing ───────────────────────────────────── */

  const handleCreateListing = useCallback(
    async (data: {
      title: string;
      price: number;
      condition: string;
      category: string;
      description?: string;
      images?: File[];
      listing_type: "sell" | "swap" | "sell_or_swap";
      swap_for?: string;
      swap_for_tags: string[];
      buyout_price: number | null;
      location?: string;
      phone?: string;
    }) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to create a listing", { icon: "🔒" });
        return;
      }

      if (data.phone) {
        const supabase = createClient();
        await supabase
          .from("profiles")
          .update({ phone: data.phone })
          .eq("id", user.id);
        setSellerPhone(data.phone);
      }

      const imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        for (const file of data.images) {
          const url = await uploadListingImage(file);
          if (url) imageUrls.push(url);
        }
      }

      const listing = await createListing({
        title: data.title,
        price: data.price,
        condition: data.condition,
        category: data.category,
        description: data.description,
        images: imageUrls,
        listing_type: data.listing_type,
        swap_for: data.swap_for,
        swap_for_tags: data.swap_for_tags,
        buyout_price: data.buyout_price,
        location: data.location || null,
      });

      if (listing) {
        toast.success("Listing published!");
        setCreateOpen(false);
      } else {
        toast.error("Failed to create listing. Please try again.");
      }
    },
    [user, createListing, uploadListingImage]
  );

  /* ── Delete listing ───────────────────────────────────── */

  const handleDeleteListing = useCallback(
    async (id: string) => {
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      const success = await deleteListing(id);
      if (success) {
        toast.success("Listing deleted");
        setSelectedListing(null);
      } else {
        toast.error("Failed to delete listing. Please try again.");
      }
    },
    [user, deleteListing]
  );

  /* ── Mark as sold ─────────────────────────────────────── */

  const handleMarkAsSold = useCallback(
    async (id: string) => {
      if (!user) return;

      const updated = await updateListing(id, { status: "sold" });
      if (updated) {
        toast.success("Marked as sold!");
        setSelectedListing(updated);
      } else {
        toast.error("Failed to update listing.");
      }
    },
    [user, updateListing]
  );

  /* ── Message seller (opens in-marketplace chat panel) ──── */

  const handleMessageSeller = useCallback(
    (listing: MarketplaceListing) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to message the seller", { icon: "🔒" });
        return;
      }

      if (listing.seller_id === user.id) {
        toast("You can't message yourself", { icon: "😅" });
        return;
      }

      // Close detail modal and open chat panel
      setSelectedListing(null);
      setChatListing(listing);
      setChatOpen(true);
    },
    [user]
  );

  /* ── Propose swap ─────────────────────────────────────── */

  const handleProposeSwap = useCallback(
    async (listing: MarketplaceListing) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to propose a swap", { icon: "🔒" });
        return;
      }

      if (listing.seller_id === user.id) {
        toast("You can't swap with yourself", { icon: "😅" });
        return;
      }

      setSwapProposalTarget(listing);
      setMyListingsLoading(true);
      const fetched = await getMyListings();
      setMyListings(fetched.filter((l) => l.id !== listing.id));
      setMyListingsLoading(false);
    },
    [user, getMyListings]
  );

  const handleSubmitSwapProposal = useCallback(
    async (offeredListingId: string, message?: string) => {
      if (!swapProposalTarget) return;

      const proposal = await createSwapProposal(
        swapProposalTarget.id,
        offeredListingId,
        message
      );

      if (proposal) {
        toast.success("Swap proposal sent!");
        setSwapProposalTarget(null);
        setMyListings([]);
      } else {
        toast.error("Failed to send swap proposal. Please try again.");
      }
    },
    [swapProposalTarget, createSwapProposal]
  );

  /* ── Accept/decline proposal ──────────────────────────── */

  const handleAcceptProposal = useCallback(
    async (proposalId: string) => {
      const success = await updateProposalStatus(proposalId, "accepted");
      if (success) {
        toast.success("Swap proposal accepted!");
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? { ...p, status: "accepted" as const }
              : p
          )
        );
      } else {
        toast.error("Failed to accept proposal.");
      }
    },
    [updateProposalStatus]
  );

  const handleDeclineProposal = useCallback(
    async (proposalId: string) => {
      const success = await updateProposalStatus(proposalId, "declined");
      if (success) {
        toast.success("Swap proposal declined.");
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? { ...p, status: "declined" as const }
              : p
          )
        );
      } else {
        toast.error("Failed to decline proposal.");
      }
    },
    [updateProposalStatus]
  );

  /* ── Save from detail modal ───────────────────────────── */

  const handleSaveFromDetail = useCallback(
    (listing: MarketplaceListing) => {
      handleToggleSave(listing.id);
    },
    [handleToggleSave]
  );

  /* ── Inline handlers (used directly in JSX) ───────────── */

  const handleCloseDetailModal = useCallback(() => {
    setSelectedListing(null);
    setProposals([]);
  }, []);

  const handleCloseSwapModal = useCallback(() => {
    setSwapProposalTarget(null);
    setMyListings([]);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateOpen(false);
  }, []);

  const handleCloseReviewModal = useCallback(() => {
    setReviewTarget(null);
  }, []);

  const handleReviewSubmitted = useCallback(() => {
    toast.success("Review submitted! Thanks for your feedback.");
  }, []);

  const handleCloseChatPanel = useCallback(() => {
    setChatOpen(false);
    setChatListing(null);
  }, []);

  const handleExpandChatToFull = useCallback(
    (conversationId: string) => {
      setChatOpen(false);
      setChatListing(null);
      router.push(`/messages?conversation=${conversationId}`);
    },
    [router]
  );

  const handleViewSellerProfile = useCallback(
    (sellerId: string) => {
      router.push(`/marketplace/seller/${sellerId}`);
    },
    [router]
  );

  const handleRelatedClick = useCallback(
    (related: MarketplaceListing) => {
      setSelectedListing(null);
      setTimeout(() => handleOpenListing(related), 200);
    },
    [handleOpenListing]
  );

  const handleSearchSelect = useCallback(
    (query: string, cat?: string) => {
      setSearch(query);
      if (cat) setCategory(cat);
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setCategory("All");
    setListingTypeFilter("all");
    setPriceRange({ min: "", max: "" });
  }, []);

  const handleSaveSearch = useCallback(
    (searchQuery: string, currentCategory: string) => {
      const added = addSavedSearch(
        searchQuery.trim(),
        currentCategory !== "All" ? currentCategory : undefined
      );
      if (added) {
        toast.success(
          `We'll notify you when "${searchQuery.trim()}" listings appear!`
        );
      } else {
        toast("This search is already saved", { icon: "🔔" });
      }
    },
    []
  );

  /* ── Return everything the page JSX needs ──────────────── */

  return {
    // State values
    search,
    setSearch,
    debouncedSearch,
    category,
    setCategory,
    sort,
    setSort,
    listingTypeFilter,
    setListingTypeFilter,
    priceRange,
    setPriceRange,
    locationState,
    setLocationState,
    nearMe,
    setNearMe,
    geolocation,
    selectedListing,
    setSelectedListing,
    createOpen,
    setCreateOpen,
    sellerPhone,
    swapProposalTarget,
    myListings,
    myListingsLoading,
    proposals,
    proposalsLoading,
    chatOpen,
    chatListing,
    reviewTarget,
    setReviewTarget,

    // Refs
    sentinelRef,

    // From useAuth
    user,

    // From useMarketplace
    listings,
    loading,
    loadingMore,
    hasMore,
    getListings,
    actionLoading,

    // Computed
    filteredListings,
    listingTitles,

    // Handlers
    openAuthOrAction,
    handleToggleSave,
    handleOpenListing,
    handleCreateListing,
    handleDeleteListing,
    handleMarkAsSold,
    handleMessageSeller,
    handleProposeSwap,
    handleSubmitSwapProposal,
    handleAcceptProposal,
    handleDeclineProposal,
    handleSaveFromDetail,
    handleCloseDetailModal,
    handleCloseSwapModal,
    handleCloseCreateModal,
    handleCloseReviewModal,
    handleReviewSubmitted,
    handleCloseChatPanel,
    handleExpandChatToFull,
    handleViewSellerProfile,
    handleRelatedClick,
    handleSearchSelect,
    handleClearFilters,
    handleSaveSearch,
  };
}
