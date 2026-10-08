import type { Metadata } from "next";
import { AdminQuizzes } from "@/features/workspace/admin-quizzes";
export const metadata: Metadata = { title: "Testlar — Gradexa" };
export default function Page() {
  return <AdminQuizzes />;
}
