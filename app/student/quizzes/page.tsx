import type { Metadata } from "next";
import { StudentQuizzes } from "@/features/workspace/student-quizzes";
export const metadata: Metadata = { title: "Testlar — Gradexa" };
export default function Page() {
  return <StudentQuizzes />;
}
