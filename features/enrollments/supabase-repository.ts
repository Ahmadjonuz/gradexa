import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const columns = "course_id,status,courses!inner(slug,status)";

export type EnrollmentActor = {
  id: string;
  role: string;
  status: string;
};
export type EnrollmentListResult =
  | { ok: true; courseIds: string[] }
  | { ok: false; message: string };
export type EnrollResult =
  | { ok: true; courseId: string; alreadyEnrolled: boolean }
  | { ok: false; message: string };

export function enrollmentDatabaseError(error: { code?: string } | null) {
  if (["42703", "42P01", "PGRST204", "PGRST205"].includes(error?.code ?? ""))
    return "Kursga yozilish bazasi tayyor emas. Supabase’da 202610020001_enrollments_data_layer.sql faylini bajaring.";
  if (error?.code === "42501")
    return "Kursga yozilish uchun Supabase RLS ruxsatlarini tekshiring.";
  if (error?.code === "23505")
    return "Bu kursga yozilish allaqachon mavjud. Ro‘yxatni yangilang.";
  return "Supabase bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.";
}

function courseSlug(row: Record<string, unknown>) {
  const relation = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  if (!relation || typeof relation !== "object") return null;
  const parsed = slugSchema.safeParse((relation as Record<string, unknown>).slug);
  return parsed.success ? parsed.data : null;
}

export function createSupabaseEnrollmentRepository(
  client: SupabaseClient,
  actor: EnrollmentActor | null,
) {
  const active = !!actor && actor.status === "active";
  const student = active && actor!.role === "student";
  const denied = {
    ok: false as const,
    message: "Kursga yozilish uchun faol student hisobiga kiring.",
  };

  async function readOwn(): Promise<EnrollmentListResult> {
    if (!active)
      return { ok: false, message: "Sessiya tugagan yoki hisob faol emas. Qayta kiring." };
    // Admin pages still use their current student-management adapter. They do
    // not need an artificial current-student enrollment list.
    if (!student) return { ok: true, courseIds: [] };
    try {
      const courseIds: string[] = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await client
          .from("enrollments")
          .select(columns)
          .eq("student_id", actor!.id)
          .eq("status", "active")
          .eq("courses.status", "published")
          .order("enrolled_at", { ascending: false })
          .range(offset, offset + 99);
        if (error) return { ok: false, message: enrollmentDatabaseError(error) };
        for (const row of data ?? []) {
          const slug = courseSlug(row as Record<string, unknown>);
          if (slug) courseIds.push(slug);
        }
        if (!data || data.length < 100) break;
      }
      return { ok: true, courseIds: [...new Set(courseIds)] };
    } catch {
      return { ok: false, message: enrollmentDatabaseError(null) };
    }
  }

  async function enroll(courseId: unknown): Promise<EnrollResult> {
    if (!student) return denied;
    const parsed = slugSchema.safeParse(courseId);
    if (!parsed.success)
      return { ok: false, message: "Kurs identifikatori noto‘g‘ri." };
    try {
      const { data: course, error: courseError } = await client
        .from("courses")
        .select("id,slug")
        .eq("slug", parsed.data)
        .eq("status", "published")
        .maybeSingle();
      if (courseError)
        return { ok: false, message: enrollmentDatabaseError(courseError) };
      if (!course)
        return { ok: false, message: "Nashr qilingan kurs topilmadi." };

      const { data: existing, error: existingError } = await client
        .from("enrollments")
        .select("status")
        .eq("student_id", actor!.id)
        .eq("course_id", course.id)
        .maybeSingle();
      if (existingError)
        return { ok: false, message: enrollmentDatabaseError(existingError) };
      if (existing?.status === "active")
        return { ok: true, courseId: parsed.data, alreadyEnrolled: true };
      if (existing)
        return {
          ok: false,
          message: "Bu kursga yozilish faol emas. Administrator holatni tekshirishi kerak.",
        };

      const { error } = await client.from("enrollments").insert({
        student_id: actor!.id,
        course_id: course.id,
        status: "active",
      });
      if (error) return { ok: false, message: enrollmentDatabaseError(error) };
      return { ok: true, courseId: parsed.data, alreadyEnrolled: false };
    } catch {
      return { ok: false, message: enrollmentDatabaseError(null) };
    }
  }

  return { readOwn, enroll };
}
