import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { buildBrainData } from "@/lib/brain-data";
import BrainWeb from "./web";

export const metadata: Metadata = {
  title: "Company brain",
  description: "What we know, how far to trust it, and who knows it: one living web built from everyday work.",
};
export const dynamic = "force-dynamic"; // feedback and learned claims change the web

export default async function BrainPage() {
  // Documents and their claim scores come from the server once; the web itself polls for live changes.
  const data = await buildBrainData(await requireUser());
  return <BrainWeb docs={data.documents} scores={data.scores} />;
}
