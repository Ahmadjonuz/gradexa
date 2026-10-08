import type { Metadata } from "next";
import { CourseDetail } from "@/features/courses/course-detail";

export const metadata: Metadata = { title: "Kurs tafsilotlari — Gradexa" };
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { courseId } = await params;
  return <CourseDetail courseId={courseId} initialEdit={(await searchParams).edit === "1"} />;
}
