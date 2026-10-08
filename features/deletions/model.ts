import { z } from "zod";
export const deletionKind = z.enum(["student", "invitation", "lesson", "quiz", "course", "task"]);
export type DeletionKind = z.infer<typeof deletionKind>;
export const deletionTarget = z.object({ kind: deletionKind, id: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/) });
export const deletionInput = deletionTarget.extend({ fingerprint: z.string().regex(/^[a-f0-9]{32}$/), confirmation: z.string().trim().min(1).max(160) });
export const deletionPreview = deletionTarget.extend({ name: z.string().min(1).max(160), counts: z.record(z.number().int().nonnegative()),
  fingerprint: z.string().regex(/^[a-f0-9]{32}$/), blocked: z.string().nullable(), pending: z.boolean(), authAccount: z.boolean() });
export type DeletionPreview = z.infer<typeof deletionPreview>;
export type DeletionResult = { ok: true; message: string } | { ok: false; message: string; refresh?: boolean };
export type PreviewResult = { ok: true; preview: DeletionPreview } | { ok: false; message: string };
export const countLabels: Record<string, string> = { enrollments: "Kursga yozilishlar", results: "Test natijalari", progress: "Dars progressi va qaydlar", questions: "Test savollari", lessons: "Darslar", quizzes: "Testlar", invitations: "Taklif yozuvlari" };
export const deletionLabels: Record<DeletionKind, string> = { student: "Talaba", invitation: "Taklif", lesson: "Dars", quiz: "Test", course: "Kurs", task: "Vazifa" };
