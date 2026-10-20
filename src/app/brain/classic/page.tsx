import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { buildBrainData } from "@/lib/brain-data";
import BrainMap from "../brain-map";

export const metadata: Metadata = {
  title: "Company brain – classic map",
  description: "The qualifier mind map: company, domains, topics, documents.",
};
export const dynamic = "force-dynamic";

// The qualifier's mind map, kept for reference. The main Brain view is /brain.
export default async function ClassicBrainPage() {
  return <BrainMap data={await buildBrainData(await requireUser())} />;
}
