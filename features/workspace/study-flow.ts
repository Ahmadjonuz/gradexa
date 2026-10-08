import type { Course } from "@/features/courses/model";
import { calendarDay, reportDate } from "@/lib/report-time";
import type { Attempt, Lesson, QuizView, Student } from "./model";
import { lessonUnlocked, orderedLessons } from "./learning-model";

export function nextStudentLesson(courses: Course[], lessons: Lesson[], completed: string[], student?: Student) {
  if (!student || student.status !== "active" || student.invitation) return undefined;
  for (const course of courses) {
    if (course.status !== "published" || !student.courseIds.includes(course.id)) continue;
    const available = orderedLessons(lessons.filter(lesson => lesson.published && lesson.courseId === course.id));
    const next = available.find(lesson => !completed.includes(lesson.id) && lessonUnlocked(lesson.id, available, completed, course.sequential));
    if (next) return next;
  }
  return undefined;
}

export function recentAttempts(attempts: Attempt[]) {
  // IDs are not chronological; Supabase returns UUID-ordered pages.
  const fraction = (value: string) => Number((value.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0").slice(3, 9));
  return [...attempts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || fraction(b.createdAt) - fraction(a.createdAt) || b.id.localeCompare(a.id));
}

export function quizAvailability(quiz: QuizView | undefined, courses: Course[], student: Student | undefined, attempts: Attempt[]) {
  const own = recentAttempts(attempts.filter(attempt => attempt.studentId === student?.id && attempt.quizId === quiz?.id));
  const remaining = quiz ? Math.max(0, (quiz.maxAttempts ?? 3) - own.length) : 0;
  const accessible = !!quiz && quiz.published && quiz.questions.length > 0 && !!student && !student.invitation && student.status === "active"
    && student.courseIds.includes(quiz.courseId) && courses.some(course => course.id === quiz.courseId && course.status === "published");
  return { accessible, canStart: accessible && remaining > 0, remaining, attempts: own, latest: own[0] };
}

export function filterResults(attempts: Attempt[], filters: { course: string; quiz: string; status: string; since: string }) {
  const since = calendarDay(filters.since) === null ? "" : filters.since;
  return recentAttempts(attempts.filter(attempt =>
    (filters.course === "all" || attempt.courseId === filters.course)
    && (filters.quiz === "all" || attempt.quizId === filters.quiz)
    && (!since || reportDate(attempt.createdAt) >= since)
    && (filters.status === "all" || (filters.status === "passed" ? attempt.score >= attempt.passScore : attempt.score < attempt.passScore)),
  ));
}

export function resultPage<T>(items: T[], requestedPage: number, size = 10) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(requestedPage) || 1));
  const start = (page - 1) * size;
  return { page, pages, items: items.slice(start, start + size), first: items.length ? start + 1 : 0, last: Math.min(start + size, items.length) };
}
