import type { Course } from "@/features/courses/model";
import type { Lesson, Student, WorkspaceData } from "./model";
import { lessonUnlocked, orderedLessons } from "./learning-model";

export const adminActions = [
  { name: "Darslarni boshqarish", href: "/admin/lessons" },
  { name: "Testlarni boshqarish", href: "/admin/quizzes" },
  { name: "Yangi test yaratish", href: "/admin/quizzes/new" },
  { name: "Natijalar", href: "/admin/quiz-results" },
  { name: "Talabalar", href: "/admin/students" },
  { name: "Kutilayotgan takliflar", href: "/admin/students?status=invited" },
  { name: "Analitika", href: "/admin/analytics" },
  { name: "Sozlamalar", href: "/admin/settings" },
];

export function nextLessonOrder(lessons: Lesson[], courseId: string, module: string) {
  const used = new Set(lessons.filter(l => l.courseId === courseId && l.module === module.trim()).map(l => l.order));
  const next = Math.max(0, ...used) + 1;
  if (next <= 999) return next;
  for (let order = 1; order <= 999; order++) if (!used.has(order)) return order;
  return null;
}

export function duplicateLessonOrder(lessons: Lesson[], lesson: Lesson) {
  return lessons.some(l => l.id !== lesson.id && l.courseId === lesson.courseId && l.module === lesson.module.trim() && l.order === lesson.order);
}

export function studentSearchLessons(courses: Course[], data: Pick<WorkspaceData, "lessons" | "completed">, student?: Student) {
  if (!student || student.status !== "active" || student.invitation) return [];
  const available = courses.filter(c => c.status === "published" && student.courseIds.includes(c.id));
  const completed = data.completed[student.id] ?? [];
  return available.flatMap(course => {
    const lessons = orderedLessons(data.lessons.filter(l => l.published && l.courseId === course.id));
    return lessons.map(lesson => ({ ...lesson, courseTitle: course.title, locked: !lessonUnlocked(lesson.id, lessons, completed, course.sequential) }));
  });
}

export function studentStatusFilter(value?: string) {
  return value === "active" || value === "invited" || value === "paused" ? value : "all";
}
