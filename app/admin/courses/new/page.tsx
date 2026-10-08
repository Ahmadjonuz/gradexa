import type { Metadata } from "next";
import { CourseCreate } from "@/features/courses/course-create";

export const metadata: Metadata = { title: "Yangi kurs — Gradexa" };
export default function NewCoursePage() {
  return <CourseCreate />;
}
