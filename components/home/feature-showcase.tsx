import Link from "next/link";
import {
  Trophy,
  ShoppingBag,
  Users,
  Swords,
  Shield,
  TrendingUp,
  MessageCircle,
  BarChart3,
  Hash,
  ArrowRight,
  Repeat2,
  Star,
  Zap,
  Target,
  Crown,
  Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Esports Showcase ──────────────────────────────── */

const ESPORTS_FEATURES = [
  { icon: <Swords size={16} />, text: "4 bracket formats: Single, Double, Round Robin, Swiss" },
  { icon: <Crown size={16} />, text: "Teams, check-in, live streams, and dispute resolution" },
  { icon: <TrendingUp size={16} />, text: "Leaderboards, rankings, and player profiles" },
  { icon: <Zap size={16} />, text: "Achievement system with rarity tiers" },
];

function EsportsMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      {/* Phone frame */}
      <div className="relative bg-surface border-2 border-border rounded-[2rem] p-3 shadow-2xl shadow-magenta/10">
        <div className="bg-base rounded-[1.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[10px] text-text-muted">9:41</span>
            <div className="w-20 h-5 bg-surface-alt rounded-full" />
            <span className="text-[10px] text-text-muted">100%</span>
          </div>
          {/* Header */}
          <div className="px-4 py-3">
            <span className="text-[10px] text-magenta font-semibold uppercase tracking-widest">Esports</span>
            <h4 className="text-sm font-heading font-bold text-text mt-0.5">Weekend FC 26 Cup</h4>
          </div>
          {/* Bracket mini preview */}
          <div className="px-4 pb-3 space-y-1.5">
            {[
              { p1: "DragonSlayer", p2: "NightWolf", s1: 3, s2: 1, done: true },
              { p1: "PhantomX", p2: "CyberKing", s1: 2, s2: 2, done: false },
              { p1: "BlazeMaster", p2: "ShadowFx", s1: 0, s2: 0, done: false },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-alt rounded-lg p-2">
                <div className="flex-1 text-[10px]">
                  <div className={cn("flex items-center justify-between", m.done && m.s1 > m.s2 && "text-green")}>
                    <span className="text-text truncate">{m.p1}</span>
                    <span className="font-bold">{m.s1}</span>
                  </div>
                  <div className={cn("flex items-center justify-between mt-0.5", m.done && m.s2 > m.s1 && "text-green")}>
                    <span className="text-text truncate">{m.p2}</span>
                    <span className="font-bold">{m.s2}</span>
                  </div>
                </div>
                <div className={`w-1.5 h-8 rounded-full ${m.done ? "bg-green" : "bg-magenta/30"}`} />
              </div>
            ))}
          </div>
          {/* Bottom action */}
          <div className="px-4 pb-4">
            <div className="bg-magenta/15 border border-magenta/30 rounded-lg px-3 py-2 text-center">
              <span className="text-[11px] font-semibold text-magenta">Register Now — ₦2,000 Entry</span>
            </div>
          </div>
        </div>
      </div>
      {/* Glow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[60px] bg-magenta/15 rounded-full blur-[40px]" />
    </div>
  );
}

export function EsportsShowcase() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <div>
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-magenta/20 bg-magenta/5">
          <Trophy size={12} className="text-magenta" />
          <span className="text-[11px] font-semibold text-magenta uppercase tracking-widest">Esports</span>
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text tracking-tight mb-4">
          COMPETE AT THE<br />
          <span className="text-magenta">HIGHEST LEVEL</span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
          Run tournaments, build your team, climb the leaderboard, and earn achievements.
          From grassroots weeklies to major events — CGE is where competitors are made.
        </p>
        <ul className="space-y-3 mb-8">
          {ESPORTS_FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text/80">
              <div className="w-7 h-7 rounded-lg bg-magenta/10 flex items-center justify-center shrink-0 text-magenta mt-0.5">
                {f.icon}
              </div>
              {f.text}
            </li>
          ))}
        </ul>
        <Link
          href="/esports"
          className="inline-flex items-center gap-2 text-sm font-semibold text-magenta hover:text-magenta/80 transition-colors group"
        >
          Explore Esports
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="flex justify-center lg:justify-end">
        <EsportsMockup />
      </div>
    </div>
  );
}

/* ── Marketplace Showcase ──────────────────────────── */

const MARKETPLACE_FEATURES = [
  { icon: <ShoppingBag size={16} />, text: "Buy, sell, and swap gaming gear with verified users" },
  { icon: <Repeat2 size={16} />, text: "Built-in swap proposals — trade what you have for what you want" },
  { icon: <Shield size={16} />, text: "Trust system with seller ratings and verification levels" },
  { icon: <Star size={16} />, text: "Trending items, saved searches, and instant notifications" },
];

function MarketplaceMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      <div className="relative bg-surface border-2 border-border rounded-[2rem] p-3 shadow-2xl shadow-cyan/10">
        <div className="bg-base rounded-[1.5rem] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[10px] text-text-muted">9:41</span>
            <div className="w-20 h-5 bg-surface-alt rounded-full" />
            <span className="text-[10px] text-text-muted">100%</span>
          </div>
          <div className="px-4 py-3">
            <span className="text-[10px] text-cyan font-semibold uppercase tracking-widest">Marketplace</span>
            <h4 className="text-sm font-heading font-bold text-text mt-0.5">Trending Now</h4>
          </div>
          {/* Listing cards */}
          <div className="px-4 pb-4 space-y-2">
            {[
              { name: "PS5 DualSense Edge", price: "₦85,000", condition: "Like New", color: "bg-cyan/10" },
              { name: "Razer BlackShark V2", price: "₦32,000", condition: "New", color: "bg-green/10" },
              { name: "Xbox Elite Controller", price: "₦45,000", condition: "Used - Good", color: "bg-magenta/10", swap: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-alt rounded-lg p-2.5">
                <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}>
                  <Gamepad2 size={18} className="text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-text truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-bold text-cyan">{item.price}</span>
                    <span className="text-[9px] text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">{item.condition}</span>
                  </div>
                </div>
                {item.swap && (
                  <div className="shrink-0">
                    <Repeat2 size={12} className="text-magenta" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <div className="flex-1 bg-cyan/15 border border-cyan/30 rounded-lg px-3 py-2 text-center">
              <span className="text-[11px] font-semibold text-cyan">List Item</span>
            </div>
            <div className="flex-1 bg-surface-alt border border-border rounded-lg px-3 py-2 text-center">
              <span className="text-[11px] font-semibold text-text-muted">Browse All</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[60px] bg-cyan/15 rounded-full blur-[40px]" />
    </div>
  );
}

export function MarketplaceShowcase() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <div className="flex justify-center lg:justify-start order-2 lg:order-1">
        <MarketplaceMockup />
      </div>
      <div className="order-1 lg:order-2">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5">
          <ShoppingBag size={12} className="text-cyan" />
          <span className="text-[11px] font-semibold text-cyan uppercase tracking-widest">Marketplace</span>
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text tracking-tight mb-4">
          BUY, SELL & SWAP<br />
          <span className="text-cyan">GAMING GEAR</span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
          The gaming marketplace built for gamers, by gamers. List your gear, find deals,
          and swap with verified sellers you can trust — all backed by our community reputation system.
        </p>
        <ul className="space-y-3 mb-8">
          {MARKETPLACE_FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text/80">
              <div className="w-7 h-7 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0 text-cyan mt-0.5">
                {f.icon}
              </div>
              {f.text}
            </li>
          ))}
        </ul>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan hover:text-cyan/80 transition-colors group"
        >
          Browse Marketplace
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

/* ── Community Showcase ────────────────────────────── */

const COMMUNITY_FEATURES = [
  { icon: <MessageCircle size={16} />, text: "Real-time feed with topics, mentions, and hashtags" },
  { icon: <BarChart3 size={16} />, text: "Create polls, share clips, and embed streams" },
  { icon: <Hash size={16} />, text: "9 topic channels from LFG to Gaming News to Memes" },
  { icon: <Target size={16} />, text: "Content moderation, report system, and community guidelines" },
];

function CommunityMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      <div className="relative bg-surface border-2 border-border rounded-[2rem] p-3 shadow-2xl shadow-green/10">
        <div className="bg-base rounded-[1.5rem] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[10px] text-text-muted">9:41</span>
            <div className="w-20 h-5 bg-surface-alt rounded-full" />
            <span className="text-[10px] text-text-muted">100%</span>
          </div>
          <div className="px-4 py-3">
            <span className="text-[10px] text-green font-semibold uppercase tracking-widest">Community</span>
            <h4 className="text-sm font-heading font-bold text-text mt-0.5">Trending Now</h4>
          </div>
          {/* Topic chips */}
          <div className="px-4 pb-2 flex gap-1.5 overflow-hidden">
            {["LFG", "Clips", "News", "Memes"].map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-surface-alt border border-border text-text-muted shrink-0">
                {t}
              </span>
            ))}
          </div>
          {/* Post previews */}
          <div className="px-4 pb-4 space-y-2">
            {[
              { user: "DragonSlayer", text: "Just clutched a 1v3 in the finals 🔥 #tournaments", reactions: "🔥 12 · 💬 8", tag: "Clips" },
              { user: "AmaraGG", text: "Looking for a Tekken 8 practice partner in Lagos. DM me!", reactions: "🎮 5 · 💬 3", tag: "LFG" },
              { user: "NightWolf", text: "Who's watching the FC 26 finals tonight?", reactions: "❤️ 23 · 💬 15", tag: "News", poll: true },
            ].map((post, i) => (
              <div key={i} className="bg-surface-alt rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-green">{post.user[0]}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-text">{post.user}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-text-muted">{post.tag}</span>
                </div>
                <p className="text-[10px] text-text/80 leading-relaxed">{post.text}</p>
                {post.poll && (
                  <div className="mt-1.5 space-y-1">
                    <div className="h-4 bg-green/10 rounded border border-green/20 flex items-center px-2">
                      <span className="text-[8px] text-green">Yes — 67%</span>
                    </div>
                    <div className="h-4 bg-surface rounded border border-border flex items-center px-2">
                      <span className="text-[8px] text-text-muted">No — 33%</span>
                    </div>
                  </div>
                )}
                <p className="text-[9px] text-text-muted mt-1.5">{post.reactions}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[60px] bg-green/15 rounded-full blur-[40px]" />
    </div>
  );
}

export function CommunityShowcase() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <div>
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-green/20 bg-green/5">
          <Users size={12} className="text-green" />
          <span className="text-[11px] font-semibold text-green uppercase tracking-widest">Community</span>
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text tracking-tight mb-4">
          YOUR CREW.<br />
          <span className="text-green">YOUR SPACE.</span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
          A community built around gaming — not bolted on as an afterthought. Find your squad,
          share highlights, run polls, and stay connected with the scene.
        </p>
        <ul className="space-y-3 mb-8">
          {COMMUNITY_FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text/80">
              <div className="w-7 h-7 rounded-lg bg-green/10 flex items-center justify-center shrink-0 text-green mt-0.5">
                {f.icon}
              </div>
              {f.text}
            </li>
          ))}
        </ul>
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green hover:text-green/80 transition-colors group"
        >
          Join the Community
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="flex justify-center lg:justify-end">
        <CommunityMockup />
      </div>
    </div>
  );
}
