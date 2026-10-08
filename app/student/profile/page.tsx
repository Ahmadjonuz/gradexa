import type { Metadata } from "next";
import { StudentProfile } from "@/features/workspace/profiles";
import { getCurrentProfile } from "@/lib/auth";
export const metadata: Metadata = { title: "Mening profilim — Gradexa" };
export default async function Page() {
  return <StudentProfile account={await getCurrentProfile()} />;
}
