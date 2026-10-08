import type { Metadata } from "next";
import { Settings } from "@/features/workspace/settings";
import { getCurrentProfile } from "@/lib/auth";
export const metadata: Metadata = { title: "Sozlamalar — Gradexa" };
export default async function Page() {
  return <Settings account={await getCurrentProfile()} />;
}
