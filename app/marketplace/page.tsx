"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Plus, ArrowUpDown, ArrowLeftRight, MapPin, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingCard } from "@/components/marketplace/listing-card";
import { TrendingCarousel } from "@/components/marketplace/trending-carousel";
import { CategoryShowcase } from "@/components/marketplace/category-showcase";
import { RecentlyViewed } from "@/components/marketplace/recently-viewed";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { SavedSearchesButton } from "@/components/marketplace/saved-searches";
import { triggerAppGate, AppGateBanner } from "@/components/ui/app-gate";
import { LiveTournamentsWidget } from "@/components/cross-pillar/live-tournaments-widget";
import { CommunityBuzzWidget } from "@/components/cross-pillar/community-buzz-widget";
import { PillarQuickNav } from "@/components/cross-pillar/pillar-quick-nav";
import { ErrorBoundary, WidgetErrorFallback } from "@/components/ui/error-boundary";

// Heavy modals — lazy loaded (only fetched when user opens them)
const ListingDetailModal = dynamic(
  () => import("@/components/marketplace/listing-detail-modal").then((m) => ({ default: m.ListingDetailModal })),
  { ssr: false }
);
const CreateListingModal = dynamic(
  () => import("@/components/marketplace/create-listing-modal").then((m) => ({ default: m.CreateListingModal })),
  { ssr: false }
);
const SwapProposalModal = dynamic(
  () => import("@/components/marketplace/swap-proposal-modal").then((m) => ({ default: m.SwapProposalModal })),
  { ssr: false }
);
const MarketplaceChatPanel = dynamic(
  () => import("@/components/marketplace/marketplace-chat-panel").then((m) => ({ default: m.MarketplaceChatPanel })),
  { ssr: false }
);
const LeaveReviewModal = dynamic(
  () => import("@/components/marketplace/leave-review-modal").then((m) => ({ default: m.LeaveReviewModal })),
  { ssr: false }
);
import {
  useMarketplacePage,
  SORT_OPTIONS,
  CardSkeleton,
  type SortOption,
} from "@/hooks/use-marketplace-page";

export default function MarketplacePage() {
  const mp = useMarketplacePage();

  return (
    <PullToRefresh onRefresh={async () => { await mp.getListings(); }}>
    <div className="min-h-screen bg-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-text flex items-center gap-2">
              <ArrowLeftRight size={20} className="text-magenta hidden sm:inline" />
              Swap Market
            </h1>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-cyan/70">
                <MapPin size={10} />
                Nigeria
              </span>
              <span className="text-border">&middot;</span>
              Trade, swap & sell gaming gear
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SavedSearchesButton
              listings={mp.listings}
              onSearchSelect={mp.handleSearchSelect}
            />
            <Button
              variant="magenta"
              onClick={() => triggerAppGate("marketplace-create")}
              className="hidden sm:flex"
            >
              <Plus size={16} />
              List Item
            </Button>
          </div>
        </div>

        <AppGateBanner pillar="marketplace" />

        <TrendingCarousel
          listings={mp.listings}
          onListingClick={mp.handleOpenListing}
          loading={mp.loading}
        />

        <CategoryShowcase
          listings={mp.listings}
          activeCategory={mp.category}
          onCategorySelect={mp.setCategory}
        />

        <RecentlyViewed
          allListings={mp.listings}
          onListingClick={mp.handleOpenListing}
        />

        <ListingFilters
          search={mp.search}
          onSearchChange={mp.setSearch}
          listingTypeFilter={mp.listingTypeFilter}
          onListingTypeFilterChange={mp.setListingTypeFilter}
          isSignedIn={!!mp.user}
          priceRange={mp.priceRange}
          onPriceRangeChange={mp.setPriceRange}
          locationState={mp.locationState}
          onLocationStateChange={mp.setLocationState}
          listingTitles={mp.listingTitles}
        />

        {/* Sort + Count */}
        <div className="flex items-center justify-between mt-4 mb-3">
          <p className="text-xs text-text-muted">
            {mp.loading ? (
              <span className="animate-pulse">Loading listings...</span>
            ) : (
              <>
                <span className="font-semibold text-text">{mp.filteredListings.length}</span>{" "}
                {mp.filteredListings.length === 1 ? "listing" : "listings"}
                {mp.category !== "All" && (
                  <span> in <span className="text-cyan">{mp.category}</span></span>
                )}
                {mp.listingTypeFilter === "swap" && (
                  <span> &middot; <span className="text-magenta">open to swap</span></span>
                )}
                {mp.listingTypeFilter === "buy" && (
                  <span> &middot; <span className="text-cyan">for sale</span></span>
                )}
                {mp.listingTypeFilter === "saved" && (
                  <span> &middot; <span className="text-red-400">saved</span></span>
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={12} className="text-text-muted" />
            <select
              value={mp.sort}
              onChange={(e) => mp.setSort(e.target.value as SortOption)}
              aria-label="Sort listings"
              className="text-[11px] bg-transparent border-none text-text-muted focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {mp.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : mp.filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mp.filteredListings.map((listing, index) => (
              <div
                key={listing.id}
                className="animate-fadeInUp"
                style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
              >
                <ListingCard
                  listing={listing}
                  onClick={() => mp.handleOpenListing(listing)}
                  onSave={() => mp.handleToggleSave(listing.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12">
            <EmptyState
              icon={
                mp.listingTypeFilter === "saved" ? "❤️"
                  : mp.listingTypeFilter === "swap" ? "🔄" : "🔍"
              }
              title={
                mp.listingTypeFilter === "saved" ? "No saved listings yet"
                  : mp.listingTypeFilter === "swap" ? "No swap listings found"
                  : "No listings found"
              }
              subtitle={
                mp.search || mp.category !== "All" || mp.listingTypeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Be the first to list something for swap or sale!"
              }
              action={
                mp.search || mp.category !== "All" || mp.listingTypeFilter !== "all"
                  ? { label: "Clear Filters", onClick: mp.handleClearFilters }
                  : { label: "List Something", onClick: () => mp.openAuthOrAction(() => mp.setCreateOpen(true)) }
              }
            />
            {mp.search.trim() && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => mp.handleSaveSearch(mp.search, mp.category)}
                  className="text-xs text-cyan hover:text-cyan/80 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  🔔 Save this search &amp; get notified
                </button>
              </div>
            )}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {!mp.loading && mp.filteredListings.length > 0 && (
          <div ref={mp.sentinelRef} className="flex justify-center py-8">
            {mp.loadingMore ? (
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <Loader2 size={14} className="animate-spin" />
                Loading more...
              </div>
            ) : !mp.hasMore ? (
              <p className="text-[11px] text-text-muted/50">
                You&apos;ve seen all {mp.filteredListings.length} listings
              </p>
            ) : null}
          </div>
        )}

        {/* Cross-pillar widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 animate-widgetEnter">
          <ErrorBoundary fallback={<WidgetErrorFallback name="tournaments" />}>
            <LiveTournamentsWidget />
          </ErrorBoundary>
          <ErrorBoundary fallback={<WidgetErrorFallback name="marketplace talk" />}>
            <CommunityBuzzWidget topic="marketplace-talk" title="Marketplace Talk" />
          </ErrorBoundary>
        </div>

        <PillarQuickNav current="marketplace" />
      </div>

      {/* Floating "+" button — mobile only */}
      <div className="fixed bottom-[5.5rem] right-4 z-40 sm:hidden">
        <button
          onClick={() => triggerAppGate("marketplace-create")}
          className="w-14 h-14 rounded-full bg-magenta flex items-center justify-center shadow-[0_8px_30px_rgba(255,45,120,0.35)] active:scale-90 transition-transform cursor-pointer"
          aria-label="List a new item"
        >
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* Modals */}
      <ListingDetailModal
        listing={mp.selectedListing}
        open={!!mp.selectedListing}
        onClose={mp.handleCloseDetailModal}
        onDelete={mp.handleDeleteListing}
        onMarkAsSold={mp.handleMarkAsSold}
        onMessage={() => triggerAppGate("marketplace-buy")}
        onProposeSwap={() => triggerAppGate("marketplace-swap")}
        onSave={mp.handleSaveFromDetail}
        currentUserId={mp.user?.id ?? null}
        deleteLoading={mp.actionLoading}
        proposals={mp.proposals}
        proposalsLoading={mp.proposalsLoading}
        onAcceptProposal={mp.handleAcceptProposal}
        onDeclineProposal={mp.handleDeclineProposal}
        onViewSellerProfile={mp.handleViewSellerProfile}
        onLeaveReview={() => triggerAppGate("marketplace-buy")}
        allListings={mp.listings}
        onRelatedClick={mp.handleRelatedClick}
      />

      <SwapProposalModal
        open={!!mp.swapProposalTarget}
        onClose={mp.handleCloseSwapModal}
        targetListing={mp.swapProposalTarget}
        myListings={mp.myListings}
        loadingListings={mp.myListingsLoading}
        onSubmit={mp.handleSubmitSwapProposal}
        submitting={mp.actionLoading}
      />

      <CreateListingModal
        open={mp.createOpen}
        onClose={mp.handleCloseCreateModal}
        onSubmit={mp.handleCreateListing}
        loading={mp.actionLoading}
        sellerPhone={mp.sellerPhone}
      />

      {mp.reviewTarget && (
        <LeaveReviewModal
          open={!!mp.reviewTarget}
          onClose={mp.handleCloseReviewModal}
          listing={mp.reviewTarget}
          onReviewSubmitted={mp.handleReviewSubmitted}
        />
      )}

      {mp.user && (
        <MarketplaceChatPanel
          open={mp.chatOpen}
          onClose={mp.handleCloseChatPanel}
          listing={mp.chatListing}
          currentUserId={mp.user.id}
          onExpandToFull={mp.handleExpandChatToFull}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
