"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/section-title";
import { Trophy, Users, Ticket, AlertCircle } from "lucide-react";

interface Winner {
  id: string;
  code: string;
  user_id: string;
  prize_label: string;
  zone_id: string;
  expires_at: string;
  winner: {
    id: string;
    full_name: string;
    phone: string | null;
    gamertag: string | null;
  } | null;
}

interface DrawResult {
  success: boolean;
  month: string;
  total_entries: number;
  unique_participants: number;
  winners: Winner[];
}

export default function AdminGiveawayPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [adminSecret, setAdminSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [error, setError] = useState("");

  async function runDraw() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/giveaway/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, adminSecret }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to run draw");
        return;
      }

      setResult(data as DrawResult);
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <SectionTitle
          eyebrow="Admin"
          title="Monthly Giveaway Draw"
          subtitle="Run the monthly draw to select 3 winners from signed-in bookers."
          align="center"
        />

        {/* Controls */}
        <Card className="mb-8">
          <div className="space-y-4">
            <Input
              label="Month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Input
              label="Admin Secret"
              type="password"
              placeholder="Enter admin secret"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={runDraw}
              disabled={loading || !adminSecret || !month}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-base border-t-transparent rounded-full animate-spin" />
                  Running Draw...
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  Run Draw for {month}
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-400/5 px-5 py-4 mb-8">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center">
                <Ticket size={24} className="text-cyan mx-auto mb-2" />
                <p className="text-2xl font-bold font-heading text-text">
                  {result.total_entries}
                </p>
                <p className="text-xs text-text-muted uppercase tracking-wider">
                  Total Entries
                </p>
              </Card>
              <Card className="text-center">
                <Users size={24} className="text-magenta mx-auto mb-2" />
                <p className="text-2xl font-bold font-heading text-text">
                  {result.unique_participants}
                </p>
                <p className="text-xs text-text-muted uppercase tracking-wider">
                  Unique Participants
                </p>
              </Card>
            </div>

            {/* Winners */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text mb-4">
                Winners
              </h3>
              <div className="space-y-3">
                {result.winners.map((w, i) => (
                  <Card key={w.id} className="relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      {/* Position badge */}
                      <div className="w-10 h-10 rounded-lg bg-cyan/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-cyan">#{i + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text">
                          {w.winner?.full_name || w.winner?.gamertag || "Unknown User"}
                        </p>
                        {w.winner?.phone && (
                          <p className="text-xs text-text-muted">{w.winner.phone}</p>
                        )}
                        <p className="text-xs text-cyan font-semibold mt-1">
                          {w.prize_label}
                        </p>
                      </div>

                      {/* Voucher code */}
                      <code className="bg-base border border-border rounded-lg px-3 py-2 text-xs font-mono font-bold text-cyan tracking-wider">
                        {w.code}
                      </code>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-border bg-surface-alt px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Next Steps
              </p>
              <ul className="space-y-1.5 text-xs" style={{ color: "#C4C4CC" }}>
                <li>• Winners will see an in-app notification the next time they log in</li>
                <li>• Each voucher code can be entered in the &quot;Voucher / Pass Code&quot; field at checkout</li>
                <li>• Vouchers expire at the end of next month ({new Date(result.winners[0]?.expires_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" })})</li>
                <li>• Consider sending a personal WhatsApp/email to each winner with their code</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
