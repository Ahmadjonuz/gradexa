import type { Metadata } from "next";
import { AdminLessons } from "@/features/workspace/admin-lessons";
export const metadata: Metadata = { title: "Darslar — Gradexa" };
export default function Page() {
  return <AdminLessons />;
}
