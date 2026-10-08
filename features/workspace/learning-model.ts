import type { Course } from "@/features/courses/model";
import type { Lesson, Student, WorkspaceData } from "./model";

const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function orderedLessons(lessons: Lesson[]) {
  return [...lessons].sort((a, b) => a.order - b.order || compareText(a.module, b.module) || compareText(a.id, b.id));
}
export function lessonGroups(lessons: Lesson[]) {
  const groups = new Map<string, Lesson[]>();
  orderedLessons(lessons).forEach(lesson => groups.set(lesson.module, [...(groups.get(lesson.module) ?? []), lesson]));
  return [...groups].map(([name, lessons]) => ({ name, lessons }));
}
export function lessonUnlocked(lessonId: string, lessons: Lesson[], completed: string[], sequential = false) {
  if (!sequential) return lessons.some(lesson => lesson.id === lessonId);
  const ordered = orderedLessons(lessons), index = ordered.findIndex(lesson => lesson.id === lessonId);
  return index >= 0 && ordered.slice(0, index).every(lesson => completed.includes(lesson.id));
}
export function studentCompletion(data: Pick<WorkspaceData, "lessons" | "completed">, student: Student) {
  const lessons = data.lessons.filter(l => l.published && student.courseIds.includes(l.courseId));
  const done = data.completed[student.id] ?? [];
  const completed = lessons.filter(l => done.includes(l.id)).length;
  return { completed, total: lessons.length, percent: lessons.length ? Math.round(completed / lessons.length * 100) : 0 };
}
export function courseFacts(data: Pick<WorkspaceData, "lessons" | "completed">, course: Course) {
  const lessons = data.lessons.filter(l => l.courseId === course.id);
  return { lessons: lessons.length, minutes: lessons.reduce((sum, l) => sum + l.minutes, 0) };
}
export function studentsCsv(students: Student[], courses: Course[], data: Pick<WorkspaceData, "lessons" | "completed">) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + [["Ism", "Email", "Holat", "Kurslar", "Progress (%)", "Qo‘shilgan (UTC)", "Taklif muddati (UTC)"], ...students.map(s => [s.name, s.email, s.status, courses.filter(c => s.courseIds.includes(c.id)).map(c => c.title).join("; "), studentCompletion(data, s).percent, s.createdAt ?? "", s.invitationExpiresAt ?? ""])].map(row => row.map(cell).join(",")).join("\r\n");
}
export function videoSource(value: string): { type: "youtube" | "file" | "link"; src: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1] ?? null;
    }
    if (id && /^[\w-]{11}$/.test(id)) return { type: "youtube", src: "https://www.youtube-nocookie.com/embed/" + id };
    if (/\.(mp4|webm)$/i.test(url.pathname)) return { type: "file", src: url.href };
    return { type: "link", src: url.href };
  } catch { return null; }
}
