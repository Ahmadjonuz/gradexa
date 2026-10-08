import type { Metadata } from "next";
import { Analytics } from "@/features/workspace/analytics";
export const metadata: Metadata = { title: "Analitika — Gradexa" };
export default function Page() {
  return <Analytics />;
}
