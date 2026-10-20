import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import Loop from "./loop";

export const metadata: Metadata = {
  title: "Company brain – live loop",
  description: "What the brain learned from everyday work, and exactly how every trust score moved.",
};
export const dynamic = "force-dynamic";

export default async function LoopPage() {
  await requireUser();
  return <Loop />;
}
