"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Users, Crown, Shield, UserMinus, UserPlus, LogOut,
  Trash2, Gamepad2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Team, TeamMember } from "@/lib/types";

interface TeamDetailModalProps {
  team: Team | null;
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
  members?: TeamMember[];
  membersLoading?: boolean;
  onLoadMembers?: (teamId: number) => Promise<TeamMember[]>;
  onJoin?: (teamId: number) => Promise<boolean>;
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
  membersLoading,
  onLoadMembers,
  onJoin,
  onLeave,
  onRemoveMember,
  onUpdateRole,
  onDelete,
  loading,
}: TeamDetailModalProps) {
  const [localMembers, setLocalMembers] = useState<TeamMember[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const members = propMembers ?? localMembers;

  useEffect(() => {
    if (open && team && onLoadMembers && !propMembers) {
      onLoadMembers(team.id).then(setLocalMembers);
    }
  }, [open, team, onLoadMembers, propMembers]);

  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  if (!team) return null;

  const isCaptain = currentUserId === team.captain_id;
  const isMember = members.some((m) => m.user_id === currentUserId);
  const myMembership = members.find((m) => m.user_id === currentUserId);
  const canManage = isCaptain || myMembership?.role === "co-captain";

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
      {!isMember && (
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
              Join Team
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
