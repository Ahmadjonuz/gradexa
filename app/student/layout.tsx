import { StudentShell } from "@/components/layout/student-shell";
import { requireGradexaRole } from "@/lib/auth";
import { StudentAccountScope } from "@/features/workspace/store";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const profile = await requireGradexaRole("student");
  return <StudentAccountScope profile={profile}><StudentShell profile={profile}>{children}</StudentShell></StudentAccountScope>;
}
