import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { buildBrainData } from "@/lib/brain-data";
import Pipeline from "../brain/pipeline";
import Loop from "./loop";

export const metadata: Metadata = {
  title: "Company brain – live loop",
  description: "What the brain learned from everyday work, and exactly how every trust score moved.",
};
export const dynamic = "force-dynamic";

export default async function LoopPage() {
  const data = await buildBrainData(await requireUser());
  return (
    <>
      <Loop />
      {/* How a document or a meeting becomes a statement the brain can score. */}
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <Pipeline data={data} />
      </div>
    </>
  );
}
