import type { Metadata } from "next";
import { CoursesView } from "@/features/courses/courses-view";

export const metadata: Metadata = { title: "Kurslar — Gradexa" };
export default function CoursesPage() {
  return <CoursesView />;
}
