import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quizSchema, quizViewSchema, studentSchema, attemptSchema, workspaceSchema, taskSchema, emptyWorkspace, type LiveWorkspaceData } from "./model";

type Actor = { id: string; role: string; status: string } | null;
const key = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
const date = z.string().datetime({ offset: true });
export const commandSchemas = {
  quiz: quizSchema,
  "quiz-import": quizSchema,
  submit: z.object({ quizId: key, revision: z.string().uuid(), requestId: z.string().uuid(), answers: z.array(z.number().int().min(0).max(3)).min(1).max(30) }),
  completion: z.object({ lessonId: key, completed: z.boolean() }),
  note: z.object({ lessonId: key, note: z.string().max(10000) }),
  profile: studentSchema.pick({ name: true, bio: true }).extend({
    language: z.enum(["uz", "en", "ru"]), avatar: studentSchema.shape.avatar.unwrap(), updatedAt: date,
  }),
  student: studentSchema.extend({ id: z.string().uuid() }),
  preferences: workspaceSchema.shape.preferences.extend({ updatedAt: date }),
  task: taskSchema,
};
export type WorkspaceCommand = keyof typeof commandSchemas;
export type WriteResult = { ok: true; id?: string; skipped?: boolean; updatedAt?: string } | { ok: false; message: string };
export type ReadResult = { ok: true; data: LiveWorkspaceData; actorId: string } | { ok: false; message: string; denied?: boolean };
export function workspaceDatabaseError(error: { code?: string; message?: string } | null) {
  if (error?.message?.startsWith("GRADEXA: ")) return error.message.slice(9);
  if (["PGRST202", "PGRST204", "42P01", "42703", "42883"].includes(error?.code ?? ""))
    return "Supabase yangilanishi kerak. GRADEXA-DATA-UPDATE.sql faylini SQL Editor’da bajaring.";
  if (error?.code === "42501") return "Bu amal uchun faol akkaunt va tegishli ruxsat kerak. Qayta kiring.";
  if (error?.code === "23505") return "Bu yozuv allaqachon mavjud. Ro‘yxatni yangilang.";
  if (["23514", "23502", "22P02", "22007"].includes(error?.code ?? "")) return "Maydonlar noto‘g‘ri yoki to‘liq emas. Qiymatlarni tekshiring.";
  return "Supabase bilan aloqa amalga oshmadi. Internetni tekshirib, qayta urinib ko‘ring.";
}
export function createSupabaseWorkspaceRepository(client: SupabaseClient, actor: Actor) {
  const active = () => actor?.status === "active" && ["student", "admin", "owner"].includes(actor.role);
  async function read(): Promise<ReadResult> {
    if (!active()) return { ok: false, denied: true, message: "Faol akkaunt bilan qayta kiring." };
    try {
      async function pages(kind: string): Promise<unknown[]> {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 100) {
          const { data, error } = await client.rpc("gradexa_workspace_read", { p_kind: kind, p_offset: offset });
          if (error) throw error;
          if (!Array.isArray(data)) throw new Error("Invalid workspace response");
          rows.push(...data);
          if (data.length < 100) return rows;
        }
      }
      const [students, quizzes, attempts, progress, preferences, tasks] = await Promise.all(
        ["students", "quizzes", "attempts", "progress", "preferences", "tasks"].map(pages),
      );
      const data: LiveWorkspaceData = {
        ...structuredClone(emptyWorkspace), selectedStudentId: actor!.id,
        students: z.array(studentSchema).parse(students), quizzes: z.array(quizViewSchema).parse(quizzes),
        attempts: z.array(attemptSchema).parse(attempts), preferences: workspaceSchema.shape.preferences.parse(preferences[0]),
        tasks: z.array(taskSchema).parse(tasks),
      };
      const rows = z.array(z.object({ studentId: key, lessonId: key, completed: z.boolean(), note: z.string().max(10000) })).parse(progress);
      for (const row of rows) {
        if (row.completed) (data.completed[row.studentId] ??= []).push(row.lessonId);
        if (row.note) data.notes[`${row.studentId}:${row.lessonId}`] = row.note;
      }
      // Defense in depth for a database that has not yet received the answer-key policy.
      if (actor!.role === "student") data.quizzes = data.quizzes.map(q => ({ ...q, questions: q.questions.map(({ correct: _correct, explanation: _explanation, ...question }) => question) }));
      return { ok: true, data, actorId: actor!.id };
    } catch (error) {
      const e = error as { code?: string; message?: string };
      if (error instanceof z.ZodError) return { ok: false, message: "Bazadagi ma’lumot shakli mos kelmadi. Yangilash SQL fayli va mavjud yozuvlarni tekshiring." };
      return { ok: false, denied: e.code === "42501", message: workspaceDatabaseError(e) };
    }
  }
  async function write(kind: WorkspaceCommand, input: unknown): Promise<WriteResult> {
    if (!active()) return { ok: false, message: "Faol akkaunt bilan qayta kiring." };
    if (["quiz", "quiz-import", "student", "preferences", "task"].includes(kind) && actor!.role === "student")
      return { ok: false, message: "Administrator huquqi kerak." };
    const parsed = commandSchemas[kind]?.safeParse(input);
    if (!parsed?.success) return { ok: false, message: "Maydonlarni to‘ldiring va qiymatlarni tekshiring." };
    try {
      const { data, error } = await client.rpc("gradexa_workspace_write", { p_kind: kind, p_data: parsed.data });
      if (error) return { ok: false, message: workspaceDatabaseError(error) };
      const result = z.object({ id: key.optional(), skipped: z.boolean().optional(), updatedAt: date.optional() }).safeParse(data);
      if (!result.success) return { ok: false, message: "Saqlash javobi noto‘g‘ri. Qayta saqlashdan oldin ro‘yxatni yangilang." };
      return { ok: true, ...result.data };
    } catch { return { ok: false, message: workspaceDatabaseError(null) }; }
  }
  return { read, write };
}
