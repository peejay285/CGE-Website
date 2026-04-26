"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Trophy, Search, X, Swords, Plus, Calendar, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TabBar } from "@/components/ui/tab-bar";
import { SectionTitle } from "@/components/ui/section-title";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TournamentCard } from "@/components/esports/tournament-card";
import { LeaderboardTable } from "@/components/esports/leaderboard-table";
import { TeamCard } from "@/components/esports/team-card";
import { AchievementShowcase } from "@/components/esports/achievement-showcase";
import { Button } from "@/components/ui/button";
import { AppGateBanner } from "@/components/ui/app-gate";
import { CommunityBuzzWidget } from "@/components/cross-pillar/community-buzz-widget";
import { HotListingsWidget } from "@/components/cross-pillar/hot-listings-widget";
import { PillarQuickNav } from "@/components/cross-pillar/pillar-quick-nav";
import { ErrorBoundary, WidgetErrorFallback } from "@/components/ui/error-boundary";
import { useEsportsPage, TABS, STATUS_FILTERS } from "@/hooks/use-esports-page";

// Heavy modals — lazy loaded
const TournamentDetailModal = dynamic(
  () => import("@/components/esports/tournament-detail-modal").then((m) => ({ default: m.TournamentDetailModal })),
  { ssr: false }
);
const CreateTournamentModal = dynamic(
  () => import("@/components/esports/create-tournament-modal").then((m) => ({ default: m.CreateTournamentModal })),
  { ssr: false }
);
const ManageTournamentModal = dynamic(
  () => import("@/components/esports/manage-tournament-modal").then((m) => ({ default: m.ManageTournamentModal })),
  { ssr: false }
);
const TeamDetailModal = dynamic(
  () => import("@/components/esports/team-detail-modal").then((m) => ({ default: m.TeamDetailModal })),
  { ssr: false }
);
const CreateTeamModal = dynamic(
  () => import("@/components/esports/create-team-modal").then((m) => ({ default: m.CreateTeamModal })),
  { ssr: false }
);

export default function EsportsPage() {
  const ep = useEsportsPage();

  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan/5 via-magenta/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan/10 border border-cyan/20 mb-6">
            <Trophy size={14} className="text-cyan" />
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan">
              Competitive Gaming
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading tracking-tight mb-4">
            <span className="text-gradient">Compete.</span>{" "}
            <span className="text-text">Win.</span>{" "}
            <span className="text-gold">Rise.</span>
          </h1>

          <p className="text-sm md:text-base text-text-muted max-w-xl mx-auto leading-relaxed mb-10">
            Tournaments across Nigeria — solo or with your team. Climb the
            national leaderboard and earn prizes from open weekly brackets to
            major events.
          </p>

          {/* Stats banner */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold font-heading text-cyan">{ep.stats.openCount}</p>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mt-1">Open Tournaments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold font-heading text-gold">
                {ep.stats.totalPrize > 0 ? `\u20A6${ep.stats.totalPrize.toLocaleString()}` : "\u20A60"}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mt-1">Total Prize Pool</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold font-heading text-magenta">{ep.tournaments.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mt-1">Total Tournaments</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="magenta" onClick={() => ep.triggerAppGate("esports-create")}>
              <Plus size={16} />
              Host a Tournament
            </Button>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-transparent text-cyan border border-cyan/40 hover:bg-cyan/5 hover:shadow-[0_4px_20px_rgba(0,240,255,0.1)] px-6 py-2.5 text-[13px]"
            >
              <Calendar size={14} />
              Upcoming Events
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
        <AppGateBanner pillar="esports" />

        <div className="flex justify-center mb-8">
          <TabBar tabs={TABS} active={ep.activeTab} onChange={ep.setActiveTab} />
        </div>

        {/* ═══ TOURNAMENTS TAB ═══ */}
        {ep.activeTab === "Tournaments" && (
          <div>
            <div className="mb-6 space-y-4">
              <div className="relative max-w-sm mx-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search tournaments..."
                  value={ep.searchQuery}
                  onChange={(e) => ep.setSearchQuery(e.target.value)}
                  aria-label="Search tournaments"
                  autoComplete="off"
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-cyan/40 focus:border-cyan/50 transition-all duration-200"
                />
                {ep.searchQuery && (
                  <button onClick={() => ep.setSearchQuery("")} aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface transition-colors text-text-muted hover:text-text cursor-pointer">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2" role="toolbar" aria-label="Tournament status filters">
                {STATUS_FILTERS.map((sf) => (
                  <button key={sf.value} onClick={() => ep.setStatusFilter(sf.value)} aria-pressed={ep.statusFilter === sf.value}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer border active:scale-95",
                      ep.statusFilter === sf.value ? "bg-cyan/15 text-cyan border-cyan/30" : "text-text-muted border-border hover:border-cyan/20 hover:text-text"
                    )}>
                    {sf.label}
                  </button>
                ))}
              </div>

              {ep.uniqueGames.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2" role="toolbar" aria-label="Game filters">
                  <button onClick={() => ep.setGameFilter("All")} aria-pressed={ep.gameFilter === "All"}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer border active:scale-95",
                      ep.gameFilter === "All" ? "bg-magenta/15 text-magenta border-magenta/30" : "text-text-muted border-border hover:border-magenta/20 hover:text-text"
                    )}>
                    All Games
                  </button>
                  {ep.uniqueGames.map((game) => (
                    <button key={game} onClick={() => ep.setGameFilter(game)} aria-pressed={ep.gameFilter === game}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer border active:scale-95",
                        ep.gameFilter === game ? "bg-magenta/15 text-magenta border-magenta/30" : "text-text-muted border-border hover:border-magenta/20 hover:text-text"
                      )}>
                      {game}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {ep.loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : ep.filteredTournaments.length === 0 ? (
              <EmptyState
                icon="🏆"
                title={ep.searchQuery ? "No matching tournaments" : "Tournaments launching with our beta cohort"}
                subtitle={ep.searchQuery ? "Try a different search term or clear the filters." : "We're rolling out the first tournaments with beta users now. The full national bracket launches when beta opens."}
              />
            ) : (
              <div className="space-y-10">
                {ep.thisWeekTournaments.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-magenta mb-4 flex items-center gap-2">
                      <Calendar size={14} /> This week
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {ep.thisWeekTournaments.map((t) => (
                        <TournamentCard
                          key={t.id}
                          tournament={t}
                          onClick={() => ep.setSelectedTournament(t)}
                          isRegistered={ep.isRegisteredForTournament(t.id)}
                          isHost={ep.isHostOfTournament(t)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {ep.upcomingTournaments.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-cyan mb-4 flex items-center gap-2">
                      <Swords size={14} /> Upcoming & Active
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {ep.upcomingTournaments.map((t, i) => (
                        <TournamentCard key={t.id} tournament={t} onClick={() => ep.setSelectedTournament(t)}
                          isRegistered={ep.isRegisteredForTournament(t.id)} isHost={ep.isHostOfTournament(t)}
                          style={{ animationDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  </section>
                )}

                {ep.pastTournaments.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-text-muted mb-4">Completed</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {ep.pastTournaments.map((t, i) => (
                        <TournamentCard key={t.id} tournament={t} onClick={() => ep.setSelectedTournament(t)} isPast
                          isRegistered={ep.isRegisteredForTournament(t.id)} isHost={ep.isHostOfTournament(t)}
                          style={{ animationDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  </section>
                )}

                {ep.upcomingTournaments.length === 0 && ep.pastTournaments.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface-alt p-4 text-center mb-6 order-first">
                    <p className="text-sm text-text-muted">No upcoming tournaments right now. Check back soon!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ MY TOURNAMENTS TAB ═══ */}
        {ep.activeTab === "My Tournaments" && (
          <div>
            {!ep.user ? (
              <EmptyState icon="🔒" title="Sign in to see your tournaments" subtitle="You need to be signed in to view your registered tournaments." />
            ) : (
              <div className="space-y-10">
                {ep.hostedTournaments.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-magenta mb-4 flex items-center gap-2">
                      <Trophy size={14} /> Tournaments You Host
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {ep.hostedTournaments.map((t) => (
                        <TournamentCard key={t.id} tournament={t} onClick={() => ep.setManageTournament(t)}
                          isHost isPast={ep.isTournamentPast(t.date, t.status)} />
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <SectionTitle eyebrow="Your Competitions" title="REGISTERED TOURNAMENTS"
                    subtitle="Tournaments you've registered for. Track your upcoming matches." align="center" />
                  {ep.loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                  ) : ep.myTournaments.length === 0 ? (
                    <EmptyState icon="🎮" title="No registered tournaments" subtitle="Browse open tournaments and register to compete!" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {ep.myTournaments.map((t) => (
                        <TournamentCard key={t.id} tournament={t} onClick={() => ep.setSelectedTournament(t)}
                          isRegistered isPast={ep.isTournamentPast(t.date, t.status)} isHost={ep.isHostOfTournament(t)} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}

        {/* ═══ TEAMS TAB ═══ */}
        {ep.activeTab === "Teams" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <SectionTitle eyebrow="Esports Teams" title="TEAMS"
                subtitle="Create or join a team to compete in team tournaments." align="center" />
            </div>
            <div className="flex justify-center mb-8">
              <Button variant="magenta" onClick={() => ep.triggerAppGate("esports-team")}>
                <UserPlus size={16} /> Create a Team
              </Button>
            </div>

            {ep.myTeam && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-magenta mb-4 flex items-center gap-2">
                  <Users size={14} /> Your Team
                </h3>
                <div className="max-w-sm mx-auto">
                  <TeamCard team={ep.myTeam} onClick={() => ep.setSelectedTeam(ep.myTeam)} isMyTeam />
                </div>
              </div>
            )}

            {ep.teamsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : ep.teams.length === 0 ? (
              <EmptyState icon="👥" title="Teams launching with beta" subtitle="Create one of the first teams on the platform — recruiting opens when beta does." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ep.teams.filter((t) => t.id !== ep.myTeam?.id).map((team, i) => (
                  <TeamCard key={team.id} team={team} onClick={() => ep.setSelectedTeam(team)}
                    style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ LEADERBOARD TAB ═══ */}
        {ep.activeTab === "Leaderboard" && (
          <div>
            <SectionTitle eyebrow="Season Rankings" title="LEADERBOARD"
              subtitle="Top players ranked by tournament points. Compete to climb the ranks." align="center" />
            <div className="max-w-3xl mx-auto">
              {ep.loading || ep.actionLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : ep.leaderboardPlayers.length === 0 ? (
                <EmptyState icon="📊" title="National leaderboard launches with beta" subtitle="Once tournaments start running, the top players nationwide will appear here." />
              ) : (
                <LeaderboardTable
                  players={ep.leaderboardPlayers}
                  currentUserId={ep.user?.id}
                  followingIds={ep.user ? ep.followingSet : undefined}
                  onFollow={ep.user ? ep.handleFollow : undefined}
                  onUnfollow={ep.user ? ep.handleUnfollow : undefined}
                />
              )}
            </div>
          </div>
        )}

        {/* ═══ ACHIEVEMENTS TAB ═══ */}
        {ep.activeTab === "Achievements" && (
          <div>
            <SectionTitle eyebrow="Your Progress" title="ACHIEVEMENTS"
              subtitle="Unlock badges by competing in tournaments and engaging with the community." align="center" />
            <div className="max-w-2xl mx-auto">
              {!ep.user ? (
                <EmptyState icon="🏅" title="Sign in to track achievements" subtitle="Your achievements and badges will appear here once you sign in." />
              ) : ep.achievementsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : (
                <AchievementShowcase achievements={ep.achievements} playerAchievements={ep.playerAchievements} />
              )}
            </div>
          </div>
        )}

        {/* Cross-pillar widgets */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-widgetEnter">
          <ErrorBoundary fallback={<WidgetErrorFallback name="tournament talk" />}>
            <CommunityBuzzWidget topic="tournament-talk" title="Tournament Talk" />
          </ErrorBoundary>
          <ErrorBoundary fallback={<WidgetErrorFallback name="community buzz" />}>
            <CommunityBuzzWidget title="Community Buzz" />
          </ErrorBoundary>
          <ErrorBoundary fallback={<WidgetErrorFallback name="hot listings" />}>
            <HotListingsWidget />
          </ErrorBoundary>
        </div>

        <PillarQuickNav current="esports" />
      </section>

      {/* Modals */}
      <TournamentDetailModal
        tournament={ep.selectedTournament}
        open={ep.selectedTournament !== null}
        onClose={() => ep.setSelectedTournament(null)}
        onRegister={ep.handleRegister}
        onUnregister={ep.handleUnregister}
        registerLoading={ep.actionLoading}
        isRegistered={ep.selectedIsRegistered}
        isPast={ep.selectedIsPast}
        isHost={ep.selectedIsHost}
        onManage={ep.handleManageFromDetail}
      />

      <CreateTournamentModal
        open={ep.createOpen}
        onClose={() => ep.setCreateOpen(false)}
        onSubmit={ep.handleCreateTournament}
        loading={ep.actionLoading}
      />

      <ManageTournamentModal
        tournament={ep.manageTournament}
        open={ep.manageTournament !== null}
        onClose={() => ep.setManageTournament(null)}
        onUpdate={ep.handleUpdateTournament}
        onDelete={ep.handleDeleteTournament}
        onLoadRegistrants={ep.getTournamentRegistrants}
        loading={ep.actionLoading}
      />

      <CreateTeamModal
        open={ep.createTeamOpen}
        onClose={() => ep.setCreateTeamOpen(false)}
        onCreate={ep.handleCreateTeam}
        loading={ep.teamsLoading}
      />

      <TeamDetailModal
        team={ep.selectedTeam}
        open={ep.selectedTeam !== null}
        onClose={() => ep.setSelectedTeam(null)}
        currentUserId={ep.user?.id}
        members={ep.teamMembers}
        membersLoading={ep.teamsLoading}
        onLoadMembers={ep.getTeamMembers}
        onJoin={ep.handleJoinTeam}
        onLeave={ep.handleLeaveTeam}
        onRemoveMember={ep.handleRemoveMember}
        onUpdateRole={ep.updateMemberRole}
        onDelete={ep.handleDeleteTeam}
        loading={ep.teamsLoading}
      />
    </>
  );
}
