"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function MarkPaidButton({ bookingId }: { bookingId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function markPaid() {
    setBusy(true);
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as paid. Customer is checked in.");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-xl border border-green/40 bg-green/15 hover:bg-green/25 text-green font-bold uppercase tracking-wider py-4 cursor-pointer transition-colors"
      >
        <CheckCircle size={18} className="inline mr-2 -mt-0.5" />
        Collect payment & mark as paid
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 space-y-3">
      <p className="text-sm font-semibold text-gold text-center">
        Confirm: customer has paid in full at the counter?
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          fullWidth
          disabled={busy}
          onClick={markPaid}
          className="bg-gradient-to-br from-green to-emerald-600"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          Yes, mark paid
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
