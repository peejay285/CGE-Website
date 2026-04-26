import { requireAdmin } from "@/lib/require-admin";
import AdminGiveawayClient from "./client";

export const dynamic = "force-dynamic";

export default async function AdminGiveawayPage() {
  await requireAdmin();
  return <AdminGiveawayClient />;
}
