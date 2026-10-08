import type { Metadata } from "next";
import { AdminStudents } from "@/features/workspace/admin-students";
export const metadata: Metadata = { title: "Talabalar — Gradexa" };
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams;
  const filter = typeof status === "string" ? status : undefined;
  return <AdminStudents key={filter ?? "all"} initialStatus={filter} />;
}
