import type { Metadata } from "next";
import { StudentCourses } from "@/features/workspace/student-pages";
export const metadata: Metadata = { title: "Mening kurslarim — Gradexa" };
export default function Page() {
  return <StudentCourses />;
}
