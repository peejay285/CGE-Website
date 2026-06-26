"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Users, Crown, Shield, UserMinus, UserPlus, LogOut,
  Trash2, Gamepad2, Clock, Check, X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Team, TeamJoinRequest, TeamMember } from "@/lib/types";

interface TeamDetailModalProps {
  team: Team | null;
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
  members?: TeamMember[];
  joinRequests?: TeamJoinRequest[];
  pendingJoinRequest?: TeamJoinRequest | null;
  membersLoading?: boolean;
  onLoadMembers?: (teamId: number) => Promise<TeamMember[]>;
  onLoadJoinRequests?: (teamId: number) => Promise<TeamJoinRequest[]>;
  onLoadMyJoinRequest?: (teamId: number) => Promise<TeamJoinRequest | null>;
  onJoin?: (teamId: number) => Promise<boolean>;
  onApproveJoinRequest?: (requestId: string, teamId: number) => Promise<boolean>;
  onDeclineJoinRequest?: (requestId: string) => Promise<boolean>;
  onCancelJoinRequest?: (requestId: string) => Promise<boolean>;
  onLeave?: (teamId: number) => Promise<boolean>;
  onRemoveMember?: (teamId: number, userId: string) => Promise<boolean>;
  onUpdateRole?: (teamId: number, userId: string, role: "captain" | "co-captain" | "member") => Promise<boolean>;
  onDelete?: (teamId: number) => Promise<boolean>;
  loading?: boolean;
}

const ROLE_CONFIG = {
  captain: { label: "Captain", color: "gold" as const, icon: Crown },
  "co-captain": { label: "Co-Captain", color: "magenta" as const, icon: Shield },
  member: { label: "Member", color: "cyan" as const, icon: Users },
};

export function TeamDetailModal({
  team,
  open,
  onClose,
  currentUserId,
  members: propMembers,
  joinRequests: propJoinRequests,
  pendingJoinRequest: propPendingJoinRequest,
  membersLoading,
  onLoadMembers,
  onLoadJoinRequests,
  onLoadMyJoinRequest,
  onJoin,
  onApproveJoinRequest,
  onDeclineJoinRequest,
  onCancelJoinRequest,
  onLeave,
  onRemoveMember,
  onUpdateRole,
  onDelete,
  loading,
}: TeamDetailModalProps) {
  const [localMembers, setLocalMembers] = useState<TeamMember[]>([]);
  const [localJoinRequests, setLocalJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [localPendingJoinRequest, setLocalPendingJoinRequest] = useState<TeamJoinRequest | null>(null);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const members = propMembers ?? localMembers;

  useEffect(() => {
    if (open && team && onLoadMembers) {
      onLoadMembers(team.id).then(setLocalMembers);
    }
  }, [open, team, onLoadMembers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open || !team) {
        setLocalJoinRequests([]);
        setLocalPendingJoinRequest(null);
        return;
      }

      if (onLoadJoinRequests) {
        onLoadJoinRequests(team.id).then(setLocalJoinRequests);
      }

      if (currentUserId && onLoadMyJoinRequest) {
        onLoadMyJoinRequest(team.id).then(setLocalPendingJoinRequest);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [open, team, currentUserId, onLoadJoinRequests, onLoadMyJoinRequest]);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setConfirmDelete(false);
      setRequestActionId(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!team) return null;

  const isCaptain = currentUserId === team.captain_id;
  const isMember = members.some((m) => m.user_id === currentUserId);
  const myMembership = members.find((m) => m.user_id === currentUserId);
  const canManage = isCaptain || myMembership?.role === "co-captain";
  const joinRequests = (propJoinRequests ?? localJoinRequests).filter(
    (request) => request.team_id === team.id && request.status === "pending"
  );
  const pendingJoinRequest =
    propPendingJoinRequest ??
    localPendingJoinRequest ??
    joinRequests.find((request) => request.user_id === currentUserId) ??
    null;

  const handleApproveRequest = async (requestId: string) => {
    setRequestActionId(requestId);
    const success = await onApproveJoinRequest?.(requestId, team.id);
    if (success) {
      setLocalJoinRequests((prev) => prev.filter((request) => request.id !== requestId));
    }
    setRequestActionId(null);
  };

  const handleDeclineRequest = async (requestId: string) => {
    setRequestActionId(requestId);
    const success = await onDeclineJoinRequest?.(requestId);
    if (success) {
      setLocalJoinRequests((prev) => prev.filter((request) => request.id !== requestId));
    }
    setRequestActionId(null);
  };

  const handleCancelOwnRequest = async () => {
    if (!pendingJoinRequest) return;

    setRequestActionId(pendingJoinRequest.id);
    const success = await onCancelJoinRequest?.(pendingJoinRequest.id);
    if (success) {
      setLocalPendingJoinRequest(null);
      setLocalJoinRequests((prev) =>
        prev.filter((request) => request.id !== pendingJoinRequest.id)
      );
    }
    setRequestActionId(null);
  };

  const content = (
    <div className="space-y-5">
      {/* Team header */}
      <div className="flex items-center gap-4">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt=""
            className="w-16 h-16 rounded-xl object-cover border border-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-magenta/10 border border-magenta/20 flex items-center justify-center">
            <span className="text-2xl font-bold font-heading text-magenta">
              {team.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-heading text-text truncate">
              {team.name}
            </h3>
            {team.tag && (
              <span className="text-xs font-bold text-text-muted bg-surface-alt px-2 py-0.5 rounded">
                [{team.tag}]
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Users size={12} />
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
            {team.game && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Gamepad2 size={12} />
                {team.game}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <p className="text-sm text-text-muted">{team.description}</p>
      )}

      {/* Action buttons */}
      {!isMember && pendingJoinRequest && (
        <div className="space-y-2">
          <Button variant="secondary" fullWidth disabled>
            <Clock size={16} />
            Request Pending
          </Button>
          {onCancelJoinRequest && (
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              disabled={loading || requestActionId === pendingJoinRequest.id}
              onClick={handleCancelOwnRequest}
            >
              {requestActionId === pendingJoinRequest.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Cancel Request"
              )}
            </Button>
          )}
        </div>
      )}

      {!isMember && !pendingJoinRequest && (
        <Button
          variant="magenta"
          fullWidth
          disabled={loading}
          onClick={() => onJoin?.(team.id)}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <UserPlus size={16} />
              Request to Join
            </>
          )}
        </Button>
      )}

      {isMember && !isCaptain && (
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => onLeave?.(team.id)}
        >
          <LogOut size={14} />
          Leave Team
        </Button>
      )}

      {/* Join requests */}
      {canManage && joinRequests.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            Join Requests
          </p>
          <div className="space-y-2">
            {joinRequests.map((request) => {
              const displayName =
                request.profile?.gamertag ||
                request.profile?.full_name ||
                "Player";
              const initials = displayName.charAt(0).toUpperCase();
              const isBusy = requestActionId === request.id;

              return (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt border border-border"
                >
                  {request.profile?.avatar_url ? (
                    <img
                      src={request.profile.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-text-muted">
                        {initials}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {displayName}
                    </p>
                    {request.profile?.full_name && request.profile.gamertag && (
                      <p className="text-[11px] text-text-muted truncate">
                        {request.profile.full_name}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {onApproveJoinRequest && (
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={loading || isBusy}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Approve request"
                      >
                        {isBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                      </button>
                    )}
                    {onDeclineJoinRequest && (
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(request.id)}
                        disabled={loading || isBusy}
                        className="p-2 rounded-lg bg-red/10 text-red hover:bg-red/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Decline request"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Roster
        </p>
        {membersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-magenta" />
          </div>
        ) : (
          <div className="space-y-2">
            {members
              .sort((a, b) => {
                const order = { captain: 0, "co-captain": 1, member: 2 };
                return order[a.role] - order[b.role];
              })
              .map((member) => {
                const roleConfig = ROLE_CONFIG[member.role];
                const RoleIcon = roleConfig.icon;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt border border-border"
                  >
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-text-muted">
                          {(member.profile?.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        member.user_id === currentUserId ? "text-magenta" : "text-text"
                      )}>
                        {member.profile?.full_name || "Unknown"}
                      </p>
                      {member.profile?.gamertag && (
                        <p className="text-[11px] text-text-muted">@{member.profile.gamertag}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge color={roleConfig.color} size="sm">
                        <RoleIcon size={10} className="mr-1" />
                        {roleConfig.label}
                      </Badge>
                      {/* Captain can promote/demote/remove */}
                      {canManage && member.user_id !== currentUserId && member.role !== "captain" && (
                        <div className="flex gap-1">
                          {member.role === "member" && onUpdateRole && (
                            <button
                              type="button"
                              onClick={() => onUpdateRole(team.id, member.user_id, "co-captain")}
                              className="p-1 rounded hover:bg-magenta/10 text-text-muted hover:text-magenta transition-colors"
                              title="Promote to Co-Captain"
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          {member.role === "co-captain" && onUpdateRole && (
                            <button
                              type="button"
                              onClick={() => onUpdateRole(team.id, member.user_id, "member")}
                              className="p-1 rounded hover:bg-text-muted/10 text-text-muted transition-colors"
                              title="Demote to Member"
                            >
                              <Users size={14} />
                            </button>
                          )}
                          {onRemoveMember && (
                            <button
                              type="button"
                              onClick={() => onRemoveMember(team.id, member.user_id)}
                              className="p-1 rounded hover:bg-red/10 text-text-muted hover:text-red transition-colors"
                              title="Remove from team"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Danger zone for captain */}
      {isCaptain && onDelete && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-red mb-3">
            Danger Zone
          </p>
          {!confirmDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
            >
              <Trash2 size={14} />
              Disband Team
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-red flex-1">
                This will permanently delete the team and remove all members.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const success = await onDelete(team.id);
                  if (success) onClose();
                }}
                disabled={loading}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Disband"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title="Team Details" width="lg">
          {content}
        </Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title="Team Details">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
    </>
  );
}
