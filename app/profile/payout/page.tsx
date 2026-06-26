"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/lib/types";

type BankOption = {
  name: string;
  code: string;
};

type PayoutProfile = Pick<
  Profile,
  | "payout_account_name"
  | "payout_bank_name"
  | "payout_account_last4"
  | "payout_profile_verified_at"
>;

export default function PayoutProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [manualBankName, setManualBankName] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const userId = user.id;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [{ data: profileData }, bankResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "payout_account_name, payout_bank_name, payout_account_last4, payout_profile_verified_at"
          )
          .eq("id", userId)
          .maybeSingle(),
        fetch("/api/paystack/banks").catch(() => null),
      ]);

      setProfile((profileData as PayoutProfile | null) ?? null);
      if (profileData?.payout_account_name) {
        setAccountName(profileData.payout_account_name);
      }

      if (bankResponse?.ok) {
        const payload = (await bankResponse.json().catch(() => null)) as
          | { banks?: BankOption[] }
          | null;
        setBanks(payload?.banks ?? []);
      }

      setLoading(false);
    }

    load();
  }, [user]);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.code === bankCode),
    [banks, bankCode]
  );

  const bankOptions = banks.map((bank) => ({
    value: bank.code,
    label: bank.name,
  }));

  const resolvedBankName = selectedBank?.name || manualBankName.trim();
  const isValid =
    accountName.trim().length >= 2 &&
    /^\d{10}$/.test(accountNumber) &&
    bankCode.trim().length >= 2 &&
    (banks.length > 0 || resolvedBankName.length >= 2);

  async function handleSubmit() {
    if (!isValid) return;

    setSaving(true);
    try {
      const response = await fetch("/api/payout-profile/recipient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          bank_code: bankCode.trim(),
          bank_name: resolvedBankName || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            account_name?: string;
            bank_name?: string | null;
            account_last4?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save payout account");
      }

      setProfile({
        payout_account_name: payload?.account_name || accountName.trim(),
        payout_bank_name: payload?.bank_name || resolvedBankName || null,
        payout_account_last4: payload?.account_last4 || accountNumber.slice(-4),
        payout_profile_verified_at: new Date().toISOString(),
      });
      setAccountNumber("");
      toast.success("Payout account saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save payout account");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-base px-4 py-8">
        <div className="mx-auto max-w-lg text-center">
          <Wallet size={32} className="mx-auto mb-3 text-text-muted" />
          <h1 className="font-heading text-xl font-bold text-text">Payout Account</h1>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to add the bank account for tournament prize payouts.
          </p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base px-4 py-6">
      <div className="mx-auto max-w-lg space-y-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-cyan"
        >
          <ArrowLeft size={14} />
          Back to Profile
        </Link>

        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-gold/25 bg-gold/10">
            <Wallet size={22} className="text-gold" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text">
            Payout Account
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Add the Nigerian bank account CGE should use when releasing approved tournament prizes.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-surface-alt py-16">
            <Loader2 size={24} className="animate-spin text-cyan" />
          </div>
        ) : (
          <>
            {profile?.payout_profile_verified_at && (
              <div className="rounded-xl border border-green/25 bg-green/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className="mt-0.5 shrink-0 text-green" />
                  <div>
                    <p className="text-sm font-semibold text-green">
                      Payout account ready
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {profile.payout_account_name || "Account"} at{" "}
                      {profile.payout_bank_name || "your bank"} ending{" "}
                      {profile.payout_account_last4 || "****"}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface-alt p-4">
              <div className="mb-4 flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan" />
                <p className="text-xs leading-relaxed text-text-muted">
                  CGE stores a Paystack transfer recipient and only shows masked bank details in the app.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Account Name"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Name on bank account"
                  maxLength={120}
                />
                <Input
                  label="Account Number"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit account number"
                  maxLength={10}
                />
                {bankOptions.length > 0 ? (
                  <Select
                    label="Bank"
                    options={bankOptions}
                    value={bankCode}
                    onChange={(event) => setBankCode(event.target.value)}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Bank Code"
                      value={bankCode}
                      onChange={(event) => setBankCode(event.target.value)}
                      placeholder="e.g. 044"
                      maxLength={20}
                    />
                    <Input
                      label="Bank Name"
                      value={manualBankName}
                      onChange={(event) => setManualBankName(event.target.value)}
                      placeholder="Bank name"
                      maxLength={120}
                    />
                  </div>
                )}

                <Button
                  fullWidth
                  variant="primary"
                  disabled={!isValid || saving}
                  onClick={handleSubmit}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Wallet size={16} />
                      Save Payout Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
