import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { liveKb } from "@/lib/live";
import { canReadClaim } from "@/lib/access";
import type { SourceType } from "@/trust-engine";
import Connections, { type SourceStats } from "./connections";

export const metadata: Metadata = {
  title: "Company brain – connections",
  description: "Where the brain learns from: Microsoft 365, the law and company databases. Documents stay where they are; the brain keeps the facts.",
};
export const dynamic = "force-dynamic"; // learned claims change the counts

export default async function ConnectionsPage() {
  const user = await requireUser();
  const k = await liveKb();
  // Facts per kind of source, so every line on the page matches what the Brain shows.
  const stats: Partial<Record<SourceType, SourceStats>> = {};
  for (const c of k.claims.filter((c) => canReadClaim(user, c, k))) { // only what this user may see
    const s = (stats[c.source.type] ??= { facts: 0, latest: null });
    s.facts += 1;
    if (!s.latest || c.date > s.latest) s.latest = c.date;
  }
  return <Connections userName={user.name} stats={stats} />;
}
