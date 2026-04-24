"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, Flame, ChevronRight, ArrowLeftRight, Loader2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { createClient } from "@/lib/supabase/client";

interface ListingPreview {
  id: string;
  title: string;
  price: number;
  images: string[];
  listing_type: string;
  views_count: number;
  saves_count: number;
  category: string;
}

export function HotListingsWidget() {
  const [listings, setListings] = useState<ListingPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("marketplace_listings")
      .select("id, title, price, images, listing_type, views_count, saves_count, category")
      .eq("status", "active")
      .order("views_count", { ascending: false })
      .limit(4)
      .then(({ data }: { data: ListingPreview[] | null }) => {
        if (cancelled) return;
        setListings(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={14} className="text-cyan" />
          <h3 className="font-heading text-xs tracking-wide text-text">Hot Listings</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={14} className="animate-spin text-text-muted" />
        </div>
      </div>
    );
  }

  if (listings.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-cyan" />
          <h3 className="font-heading text-xs tracking-wide text-text">Hot Listings</h3>
        </div>
        <Link
          href="/marketplace"
          className="text-[10px] text-cyan hover:text-cyan/80 transition-colors flex items-center gap-0.5"
        >
          Browse all <ChevronRight size={10} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {listings.map((listing) => {
          const isSwap = listing.listing_type === "swap";
          const image = listing.images?.[0];

          return (
            <Link
              key={listing.id}
              href="/marketplace"
              className="block rounded-lg border border-border bg-surface-alt overflow-hidden hover:border-cyan/30 transition-all group"
            >
              <div className="relative aspect-square bg-surface overflow-hidden">
                {image ? (
                  <ImageSkeleton
                    src={image}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={20} className="text-text-muted/30" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-base/80 backdrop-blur-sm rounded px-1.5 py-0.5">
                  {isSwap ? (
                    <span className="text-[8px] font-bold text-magenta flex items-center gap-0.5">
                      <ArrowLeftRight size={7} />
                      Swap
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-cyan">
                      {formatPrice(listing.price)}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-1.5">
                <p className="text-[9px] font-medium text-text truncate">
                  {listing.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
