"use client";

import { useState, useRef } from "react";
import { Loader2, X, ImagePlus, ArrowLeftRight, Phone, MapPin, GripVertical } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MARKETPLACE_CATEGORIES,
  LISTING_CONDITIONS,
  SWAP_SUGGESTIONS,
  NIGERIAN_STATES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type ListingType = "sell" | "swap" | "sell_or_swap";

interface CreateListingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    title: string;
    price: number;
    condition: string;
    category: string;
    description?: string;
    images?: File[];
    listing_type: ListingType;
    swap_for?: string;
    swap_for_tags: string[];
    buyout_price: number | null;
    location?: string;
    location_state: string;
    location_city?: string;
    phone?: string;
  }) => void;
  loading?: boolean;
  sellerPhone?: string | null;
}

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SWAP_TAGS = 8;

const LISTING_TYPE_OPTIONS: { value: ListingType; label: string; desc: string }[] = [
  { value: "swap", label: "Swap Only", desc: "Trade for something" },
  { value: "sell_or_swap", label: "Sell or Swap", desc: "Flexible — either works" },
  { value: "sell", label: "Sell Only", desc: "Cash price only" },
];

export function CreateListingModal({ open, onClose, onSubmit, loading, sellerPhone }: CreateListingModalProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [buyoutPrice, setBuyoutPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [listingType, setListingType] = useState<ListingType>("swap");
  const [swapForTags, setSwapForTags] = useState<string[]>([]);
  const [swapTagInput, setSwapTagInput] = useState("");
  const [phone, setPhone] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsPhone = !sellerPhone;
  const showPrice = listingType === "sell" || listingType === "sell_or_swap";
  const showSwapFor = listingType === "swap" || listingType === "sell_or_swap";
  const showBuyoutPrice = listingType === "swap";

  const categoryOptions = MARKETPLACE_CATEGORIES
    .filter((cat) => cat !== "All")
    .map((cat) => ({ value: cat, label: cat }));

  const conditionOptions = LISTING_CONDITIONS.map((cond) => ({
    value: cond,
    label: cond,
  }));

  function addSwapTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (swapForTags.length >= MAX_SWAP_TAGS) return;
    if (swapForTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    setSwapForTags((prev) => [...prev, trimmed]);
    setSwapTagInput("");
  }

  function removeSwapTag(index: number) {
    setSwapForTags((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSwapTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSwapTag(swapTagInput);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    setImageError("");

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      if (images.length + newFiles.length >= MAX_IMAGES) {
        setImageError(`Maximum ${MAX_IMAGES} photos allowed`);
        break;
      }

      const file = files[i];

      if (!file.type.startsWith("image/")) {
        setImageError("Only image files are allowed");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setImageError("Each image must be under 5MB");
        continue;
      }

      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImages((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setImageError("");
  }

  // Drag-to-reorder images
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reorder = <T,>(arr: T[]) => {
        const result = [...arr];
        const [moved] = result.splice(dragIndex, 1);
        result.splice(dragOverIndex, 0, moved);
        return result;
      };
      setImages(reorder);
      setPreviews(reorder);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function resetForm() {
    setTitle("");
    setPrice("");
    setBuyoutPrice("");
    setCategory("");
    setCondition("");
    setDescription("");
    setListingType("swap");
    setSwapForTags([]);
    setSwapTagInput("");
    setPhone("");
    setLocationState("");
    setLocationCity("");
    previews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setPreviews([]);
    setImageError("");
  }

  const handleSubmit = () => {
    if (!isValid) return;

    if (onSubmit) {
      const swapForString = swapForTags.length > 0 ? swapForTags.join(", ") : undefined;

      onSubmit({
        title: title.trim(),
        price: showPrice ? Number(price) : 0,
        condition,
        category,
        description: description.trim() || undefined,
        images: images.length > 0 ? images : undefined,
        listing_type: listingType,
        swap_for: swapForString,
        swap_for_tags: swapForTags,
        buyout_price: showBuyoutPrice && buyoutPrice && Number(buyoutPrice) > 0
          ? Number(buyoutPrice)
          : null,
        location: [locationCity.trim(), locationState].filter(Boolean).join(", ") || undefined,
        location_state: locationState,
        location_city: locationCity.trim() || undefined,
        phone: needsPhone && phone ? phone.replace(/\s/g, "") : undefined,
      });
    }
  };

  function handleClose() {
    resetForm();
    onClose();
  }

  const isValid =
    title.trim() &&
    category &&
    condition &&
    locationState &&
    (showPrice ? price && Number(price) > 0 : true) &&
    (needsPhone ? /^0[789]\d{9}$/.test(phone.replace(/\s/g, "")) : true);

  return (
    <Modal open={open} onClose={handleClose} title="List an Item" width="lg">
      <div className="flex flex-col gap-5">
        {/* Photo upload */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block">
            Photos ({images.length}/{MAX_IMAGES})
          </label>

          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div
                key={`img-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative w-20 h-20 rounded-lg border overflow-hidden group cursor-grab active:cursor-grabbing transition-all duration-150",
                  dragOverIndex === i && dragIndex !== i
                    ? "border-cyan ring-2 ring-cyan/30 scale-105"
                    : dragIndex === i
                      ? "border-magenta opacity-50 scale-95"
                      : "border-border"
                )}
              >
                <img src={src} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                {/* First image badge */}
                {i === 0 && previews.length > 1 && (
                  <span className="absolute bottom-0.5 left-0.5 bg-cyan/90 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                    Cover
                  </span>
                )}
                {/* Drag grip */}
                <div className="absolute bottom-0.5 right-0.5 bg-base/60 rounded p-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <GripVertical size={10} className="text-white/70" />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-base/90 border border-border flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={12} className="text-text" />
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-surface-alt hover:border-cyan/30 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <ImagePlus size={20} className="text-text-muted" />
                <span className="text-[10px] text-text-muted">Add</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {imageError && (
            <p className="text-xs text-red-400 mt-1.5">{imageError}</p>
          )}
          <p className="text-[11px] text-text-muted/60 mt-1.5">
            Add up to {MAX_IMAGES} photos. Drag to reorder — first photo becomes the cover.
          </p>
        </div>

        {/* Title */}
        <Input
          label="Title"
          placeholder="What are you listing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />

        {/* Listing Type — swap-first ordering, magenta-themed */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block">
            Listing Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LISTING_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setListingType(opt.value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-center transition-all duration-200 cursor-pointer",
                  listingType === opt.value
                    ? "border-magenta bg-magenta/10 shadow-[0_0_12px_rgba(255,45,120,0.1)]"
                    : "border-border bg-surface-alt hover:border-magenta/20"
                )}
              >
                <p className={cn(
                  "text-xs font-semibold",
                  listingType === opt.value ? "text-magenta" : "text-text"
                )}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Swap tags input — shown for swap and sell_or_swap */}
        {showSwapFor && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block">
              What do you want in exchange?
            </label>

            {/* Tag chips */}
            {swapForTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {swapForTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-magenta/15 text-magenta border border-magenta/20"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeSwapTag(i)}
                      className="hover:bg-magenta/20 rounded-full p-0.5 transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input field */}
            {swapForTags.length < MAX_SWAP_TAGS && (
              <input
                type="text"
                placeholder={swapForTags.length === 0 ? "Type what you want and press Enter..." : "Add another..."}
                value={swapTagInput}
                onChange={(e) => setSwapTagInput(e.target.value)}
                onKeyDown={handleSwapTagKeyDown}
                maxLength={50}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-magenta/40 focus:ring-1 focus:ring-magenta/20 transition-colors"
              />
            )}

            {/* Quick-add suggestion buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SWAP_SUGGESTIONS
                .filter((s) => !swapForTags.some((t) => t.toLowerCase() === s.toLowerCase()))
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addSwapTag(suggestion)}
                    disabled={swapForTags.length >= MAX_SWAP_TAGS}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] border transition-colors cursor-pointer",
                      swapForTags.length >= MAX_SWAP_TAGS
                        ? "border-border/50 text-text-muted/30 cursor-not-allowed"
                        : "border-magenta/15 text-text-muted hover:bg-magenta/10 hover:text-magenta hover:border-magenta/30"
                    )}
                  >
                    + {suggestion}
                  </button>
                ))}
            </div>

            <p className="text-[11px] text-text-muted/60 mt-1.5">
              {swapForTags.length}/{MAX_SWAP_TAGS} tags added. Press Enter or tap suggestions to add.
            </p>
          </div>
        )}

        {/* Price — shown for sell and sell_or_swap */}
        {showPrice && (
          <Input
            label="Price (&#x20A6;)"
            type="number"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={0}
          />
        )}

        {/* Buyout price — shown only for swap type (optional cash alternative) */}
        {showBuyoutPrice && (
          <div>
            <Input
              label="Buyout Price (&#x20A6;)"
              type="number"
              placeholder="0"
              value={buyoutPrice}
              onChange={(e) => setBuyoutPrice(e.target.value)}
              min={0}
            />
            <p className="text-[11px] text-text-muted/60 mt-1">
              Set a cash price if someone wants to buy instead (optional)
            </p>
          </div>
        )}

        {/* Category & Condition row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label="Condition"
            options={conditionOptions}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block">
              State
            </label>
            <select
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20"
            >
              <option value="" disabled>
                Select state
              </option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block">
              City (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Bonny Island"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20"
            />
          </div>
          <p className="col-span-2 text-[11px] text-text-muted/60 -mt-1 flex items-center gap-1">
            <MapPin size={10} />
            Helps buyers and swappers know if you&apos;re nearby
          </p>
        </div>

        {/* Description */}
        <Textarea
          label="Description (optional)"
          placeholder="Describe your item... condition details, what's included, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />

        {/* WhatsApp number — only shown if user hasn't set one yet */}
        {needsPhone && (
          <div>
            <Input
              label="Your WhatsApp Number"
              placeholder="e.g. 08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={15}
            />
            <p className="text-[11px] text-text-muted/60 mt-1 flex items-center gap-1">
              <Phone size={10} />
              Interested swappers and buyers will contact you on WhatsApp
            </p>
          </div>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          fullWidth
          disabled={!isValid || loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {images.length > 0 ? "Uploading & Publishing..." : "Publishing..."}
            </>
          ) : (
            <>
              {listingType !== "sell" && <ArrowLeftRight size={14} />}
              Publish Listing
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
