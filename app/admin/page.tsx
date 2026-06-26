import Link from "next/link";
import { ShieldCheck, ShieldAlert, Wallet, Gift, LayoutDashboard } from "lucide-react";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();

  const [{ count: pendingVerifications }, { count: pendingReports }, { count: activeAssists }] =
    await Promise.all([
      supabase
        .from("id_verification_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("post_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("swap_proposals")
        .select("id", { count: "exact", head: true })
        .eq("assist_status", "active"),
    ]);

  const tools = [
    {
      href: "/admin/verifications",
      title: "ID Verifications",
      desc: "Review and approve member ID submissions.",
      Icon: ShieldCheck,
      color: "text-cyan",
      count: pendingVerifications ?? 0,
      countLabel: "pending",
    },
    {
      href: "/admin/community",
      title: "Community Moderation",
      desc: "Reports, hidden posts, blocked words, seeded threads.",
      Icon: ShieldAlert,
      color: "text-magenta",
      count: pendingReports ?? 0,
      countLabel: "reports",
    },
    {
      href: "/admin/swap-assist",
      title: "Assisted Swaps",
      desc: "Coordinate paid CGE swap facilitation.",
      Icon: Wallet,
      color: "text-gold",
      count: activeAssists ?? 0,
      countLabel: "active",
    },
    {
      href: "/admin/giveaway",
      title: "Giveaway",
      desc: "Run the monthly draw and manage vouchers.",
      Icon: Gift,
      color: "text-green",
      count: 0,
      countLabel: "",
    },
  ];

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={18} className="text-cyan" />
          <h1 className="text-lg font-bold font-heading text-text">Admin</h1>
        </div>
        <p className="text-xs text-text-muted">Staff tools for running CGE.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tools.map(({ href, title, desc, Icon, color, count, countLabel }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-cyan/30"
            >
              <div className="flex items-start justify-between gap-3">
                <Icon size={20} className={color} />
                {count > 0 && countLabel && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-magenta/15 text-magenta text-[10px] font-bold px-1.5">
                    {count} {countLabel}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-text group-hover:text-cyan transition-colors">
                {title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
