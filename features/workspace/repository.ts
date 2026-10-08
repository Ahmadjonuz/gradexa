import {
  seedWorkspace,
  workspaceSchema,
  scoreQuiz,
  type WorkspaceData,
} from "./model";
import {
  createCourseRepository,
  type StoragePort,
  type CourseSnapshot,
} from "@/features/courses/repository";
export const WORKSPACE_KEY = "gradexa.v2.workspace.v1";
export type ChangeResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };
export function workspaceRepository(storage: StoragePort) {
  function read(): { data: WorkspaceData; error: string | null } {
    try {
      const raw = storage.getItem(WORKSPACE_KEY);
      if (raw === null)
        return { data: structuredClone(seedWorkspace), error: null };
      const parsed = workspaceSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) throw new Error("Format mos emas.");
      return { data: parsed.data, error: null };
    } catch {
      return {
        data: structuredClone(seedWorkspace),
        error:
          "Mahalliy ma’lumotni o‘qib bo‘lmadi. Eski ma’lumot o‘zgartirilmadi. Brauzer saqlash ruxsatini tekshiring.",
      };
    }
  }
  function change(
    mutator: (data: WorkspaceData) => string | void,
  ): ChangeResult {
    const current = read();
    if (current.error) return { ok: false, message: current.error };
    try {
      const data = structuredClone(current.data);
      const resultId = mutator(data);
      data.revision += 1;
      const valid = workspaceSchema.safeParse(data);
      if (!valid.success)
        return {
          ok: false,
          message: `Ma’lumot noto‘g‘ri: ${valid.error.issues[0].path.join(".")} — ${valid.error.issues[0].message}`,
        };
      storage.setItem(WORKSPACE_KEY, JSON.stringify(valid.data));
      return { ok: true, ...(resultId ? { id: resultId } : {}) };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Saqlanmadi. Brauzer xotirasini tekshiring.",
      };
    }
  }
  function submit(
    quizId: string,
    studentId: string,
    answers: number[],
    expectedQuestions: string,
    currentCourses?: CourseSnapshot,
  ): ChangeResult {
    return change((data) => {
      const quiz = data.quizzes.find(
        (item) => item.id === quizId && item.published,
      );
      const student = data.students.find(
        (item) => item.id === studentId && item.status === "active",
      );
      if (!quiz || !student || !student.courseIds.includes(quiz.courseId))
        throw new Error("Test yoki kursga yozilish topilmadi.");
      // The app passes a freshly fetched Supabase snapshot. The fallback is
      // retained for the legacy offline repository and its existing tests.
      const courses = currentCourses ?? createCourseRepository(storage).read();
      if (
        !courses.ready || courses.error ||
        !courses.courses.some(
          (c) => c.id === quiz.courseId && c.status === "published",
        )
      )
        throw new Error("Kurs nashr qilinmagan yoki o‘qib bo‘lmadi.");
      if (
        data.attempts.filter(
          (attempt) => attempt.quizId === quizId && attempt.studentId === studentId,
        ).length >= (quiz.maxAttempts ?? 3)
      )
        throw new Error("Bu test uchun urinishlar soni tugagan.");
      if (JSON.stringify(quiz) !== expectedQuestions)
        throw new Error(
          "Test savollari yoki sozlamalari o‘zgargan. Sahifani yangilab, qayta boshlang.",
        );
      const attempt = {
        id: crypto.randomUUID(),
        quizId,
        studentId,
        courseId: quiz.courseId,
        title: quiz.title,
        studentName: student.name,
        createdAt: new Date().toISOString(),
        score: scoreQuiz(quiz, answers),
        passScore: quiz.passScore,
        answers,
        questions: structuredClone(quiz.questions),
      };
      data.attempts.unshift(attempt);
      return attempt.id;
    });
  }
  return { read, change, submit };
}
