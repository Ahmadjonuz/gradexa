import type { Metadata } from "next";
import { QuizEditor } from "@/features/workspace/admin-quizzes";
export const metadata: Metadata = { title: "Yangi test — Gradexa" };
export default function Page() {
  return <QuizEditor />;
}
