"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import type { TournamentRegistrant } from "@/lib/types";

interface CheckInPanelProps {
  tournamentId: number;
  tournamentDate: string;
  tournamentTime: string;
  checkInRequired?: boolean;
  checkInOpensMinutes?: number;
  registrants: TournamentRegistrant[];
  currentUserId?: string;
  isHost?: boolean;
  onCheckIn?: (tournamentId: number) => Promise<boolean>;
  loading?: boolean;
}

export function CheckInPanel({
  tournamentId,
  tournamentDate,
  tournamentTime,
  checkInRequired = true,
  checkInOpensMinutes = 30,
  registrants,
  currentUserId,
  isHost,
  onCheckIn,
  loading,
}: CheckInPanelProps) {
  const [now, setNow] = useState(new Date());

  // Tick every 10 seconds to keep countdown fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const tournamentStart = useMemo(() => {
    const dt = new Date(`${tournamentDate}T${tournamentTime}`);
    return isNaN(dt.getTime()) ? null : dt;
  }, [tournamentDate, tournamentTime]);

  const checkInOpens = useMemo(() => {
    if (!tournamentStart) return null;
    return new Date(tournamentStart.getTime() - checkInOpensMinutes * 60_000);
  }, [tournamentStart, checkInOpensMinutes]);

  const isCheckInOpen = checkInOpens ? now >= checkInOpens : false;
  const isTournamentStarted = tournamentStart ? now >= tournamentStart : false;
  const isCheckInWindow = isCheckInOpen && !isTournamentStarted;

  const currentUserReg = registrants.find((r) => r.user_id === currentUserId);
  const hasCheckedIn = currentUserReg?.checked_in === true;
  const isRegistered = Boolean(currentUserReg);

  const checkedInCount = registrants.filter((r) => r.checked_in).length;
  const totalRegistrants = registrants.length;

  // Time remaining until check-in opens or tournament starts
  const timeRemaining = useMemo(() => {
    const target = isCheckInOpen ? tournamentStart : checkInOpens;
    if (!target) return null;

    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return null;

    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1_000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, [now, isCheckInOpen, tournamentStart, checkInOpens]);

  if (!checkInRequired) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <CheckCircle size={14} className="text-cyan/60" />
          Check-In
        </h4>
        {isCheckInWindow && (
          <Badge color="green" size="md">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse mr-1" />
            Open
          </Badge>
        )}
        {!isCheckInOpen && !isTournamentStarted && (
          <Badge color="gold" size="md">
            <Clock size={10} className="mr-1" />
            Opens in {timeRemaining || "—"}
          </Badge>
        )}
        {isTournamentStarted && (
          <Badge color="red" size="md">Closed</Badge>
        )}
      </div>

      {/* Check-in progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-text-muted">Checked In</span>
          <span className="font-semibold text-text">
            {checkedInCount}/{totalRegistrants}
          </span>
        </div>
        <ProgressBar
          value={checkedInCount}
          max={totalRegistrants || 1}
          color={checkedInCount === totalRegistrants ? "var(--color-green)" : "var(--color-cyan)"}
        />
      </div>

      {/* Countdown / status message */}
      {!isCheckInOpen && !isTournamentStarted && timeRemaining && (
        <div className="text-center py-2">
          <p className="text-sm font-bold font-heading text-cyan">{timeRemaining}</p>
          <p className="text-[10px] text-text-muted mt-0.5">
            until check-in opens ({checkInOpensMinutes} minutes before start)
          </p>
        </div>
      )}

      {isCheckInWindow && isRegistered && !hasCheckedIn && (
        <div className="text-center py-2">
          <p className="text-xs text-text-muted mb-3">
            Check-in is open. Confirm your attendance before the tournament starts.
          </p>
          <Button
            variant="primary"
            fullWidth
            disabled={loading}
            onClick={() => onCheckIn?.(tournamentId)}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Checking in...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Check In Now
              </>
            )}
          </Button>
          {timeRemaining && (
            <p className="text-[10px] text-text-muted mt-2">
              Closes in {timeRemaining}
            </p>
          )}
        </div>
      )}

      {isCheckInWindow && hasCheckedIn && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green/10 border border-green/20">
            <CheckCircle size={16} className="text-green" />
            <span className="text-sm font-semibold text-green">You&apos;re checked in!</span>
          </div>
        </div>
      )}

      {isTournamentStarted && !hasCheckedIn && isRegistered && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red/10 border border-red/20">
            <AlertCircle size={16} className="text-red" />
            <span className="text-sm text-red">Check-in has closed</span>
          </div>
        </div>
      )}

      {/* Registrant check-in list (host view) */}
      {isHost && registrants.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
            Registrant Status
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {registrants.map((reg) => (
              <div
                key={reg.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-alt"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {reg.profile?.avatar_url ? (
                    <img
                      src={reg.profile.avatar_url}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-text-muted">
                        {(reg.profile?.full_name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-text truncate">
                    {reg.profile?.gamertag
                      ? `@${reg.profile.gamertag}`
                      : reg.profile?.full_name || "Unknown"}
                  </span>
                </div>
                {reg.checked_in ? (
                  <CheckCircle size={14} className="text-green shrink-0" />
                ) : (
                  <Clock size={14} className="text-text-muted/40 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
