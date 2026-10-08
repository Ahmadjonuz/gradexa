import { AdminShell } from "@/components/layout/admin-shell";
import { requireGradexaRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireGradexaRole("admin");
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
