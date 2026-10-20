import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { buildBrainData } from "@/lib/brain-data";
import Pipeline from "../brain/pipeline";
import Loop from "./loop";

export const metadata: Metadata = {
  title: "Company brain – what changed today",
  description: "What the brain learned from everyday work, and exactly how every trust score moved.",
};
export const dynamic = "force-dynamic";

export default async function LoopPage() {
  const data = await buildBrainData(await requireUser());
  return (
    <>
      {/* How a meeting or a document becomes a statement the brain can score, right under the heading. */}
      <Loop howItWorks={<Pipeline data={data} />} />
      <p className="pb-12 text-center text-xs text-neutral-400">All people, clients and documents are fictional.</p>
    </>
  );
}
