"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AVATARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

interface AvatarPickerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}

export function AvatarPicker({
  open,
  onClose,
  userId,
  currentUrl,
  onChange,
}: AvatarPickerProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"preset" | "upload">("preset");
  const [busy, setBusy] = useState(false);

  async function setAvatar(url: string | null) {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(url);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("avatar-updated"));
    }
    toast.success(url ? "Avatar updated" : "Avatar cleared");
    onClose();
  }

  async function handleUpload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("File is larger than 5 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await setAvatar(data.publicUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change avatar" width="md">
      <div className="flex gap-1.5 mb-4">
        <TabBtn active={tab === "preset"} onClick={() => setTab("preset")}>
          Choose preset
        </TabBtn>
        <TabBtn active={tab === "upload"} onClick={() => setTab("upload")}>
          Upload custom
        </TabBtn>
      </div>

      {tab === "preset" && (
        <div className="grid grid-cols-4 gap-3">
          {DEFAULT_AVATARS.map((url) => {
            const selected = currentUrl === url;
            return (
              <button
                key={url}
                type="button"
                disabled={busy}
                onClick={() => setAvatar(url)}
                className={cn(
                  "relative aspect-square rounded-full border-2 overflow-hidden cursor-pointer",
                  "transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait",
                  selected
                    ? "border-cyan ring-2 ring-cyan/40"
                    : "border-border hover:border-cyan/40",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover bg-surface-alt"
                />
                {selected && (
                  <span className="absolute inset-0 bg-cyan/15 flex items-center justify-center">
                    <Check size={20} className="text-cyan" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tab === "upload" && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer",
              "border-border hover:border-cyan/40 hover:bg-cyan/5 transition-colors",
              "disabled:opacity-50 disabled:cursor-wait",
            )}
          >
            {busy ? (
              <Loader2 size={24} className="animate-spin text-cyan" />
            ) : (
              <Upload size={24} className="text-text-muted" />
            )}
            <p className="text-sm font-semibold text-text">
              {busy ? "Uploading..." : "Pick an image to upload"}
            </p>
            <p className="text-[11px] text-text-muted">
              JPG, PNG or WebP — up to 5 MB
            </p>
          </button>
        </div>
      )}

      {currentUrl && (
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <p className="text-[11px] text-text-muted">
            Already using a custom avatar
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setAvatar(null)}
          >
            <Trash2 size={12} />
            Remove
          </Button>
        </div>
      )}
    </Modal>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer",
        "transition-colors",
        active
          ? "bg-cyan/15 text-cyan border-cyan/30"
          : "bg-surface-alt text-text-muted border-border hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
