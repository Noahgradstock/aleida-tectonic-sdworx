import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import WhoKnows from "./who-knows";

export const metadata: Metadata = {
  title: "Company brain – who knows what",
  description: "A knowledge web of people, topics, documents and clients, built from everyday work.",
};
export const dynamic = "force-dynamic";

export default async function GraphPage() {
  await requireUser();
  return <WhoKnows />;
}
