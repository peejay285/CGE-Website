"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Voucher } from "@/lib/types";

export function useVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setVouchers([]);
        return;
      }

      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVouchers((data as Voucher[]) || []);
    } catch {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Mark a voucher as notified (so the banner doesn't show again)
  const dismissVoucher = useCallback(
    async (voucherId: string) => {
      await supabase
        .from("vouchers")
        .update({ notified: true })
        .eq("id", voucherId);

      setVouchers((prev) => prev.filter((v) => v.id !== voucherId));
    },
    [supabase]
  );

  // Only show vouchers the user hasn't dismissed yet
  const unnotified = vouchers.filter((v) => !v.notified);

  return { vouchers, unnotified, loading, dismissVoucher, refetch: fetchVouchers };
}
