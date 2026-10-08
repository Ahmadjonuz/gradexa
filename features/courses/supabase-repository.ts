import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { courseInputSchema, courseSchema, type Course } from "./model";
import type { CourseResult } from "./repository";

const columns = "id,slug,title,description,category,level,status,language,sequential,cover_image,created_at,updated_at";
const slugSchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const existingSchema = z.object({ id: slugSchema, updatedAt: z.string().datetime({ offset: true }) });
export type CourseListResult = { ok: true; courses: Course[] } | { ok: false; message: string };
export type CourseImportResult = { ok: true; inserted: boolean } | { ok: false; message: string };
export type CourseActor = { id: string; role: string; status: string };

export function courseDatabaseError(error: { code?: string } | null) {
  if (["42703", "42P01", "PGRST204", "PGRST205"].includes(error?.code ?? ""))
    return "Kurslar bazasi tayyor emas. Supabase’da 202609250001_courses_data_layer.sql faylini bajaring.";
  if (error?.code === "42501") return "Kurslar uchun Supabase ruxsatlarini tekshiring. SQL yangilanishi bajarilgan bo‘lishi kerak.";
  if (error?.code === "23505") return "Bu kurs allaqachon mavjud. Sahifani yangilab ko‘ring.";
  return "Supabase bilan bog‘lanib bo‘lmadi. Ma’lumotni tekshirib, qayta urinib ko‘ring.";
}

// The UI keeps its existing course identifiers in courses.slug. SQL relations
// continue using courses.id (UUID). Never change a slug during an edit.
export function mapCourseRow(row: Record<string, unknown>): Course {
  return courseSchema.parse({
    id: row.slug, title: row.title, description: row.description,
    category: row.category, level: row.level, status: row.status,
    language: row.language, sequential: row.sequential, coverImage: row.cover_image,
    // Learning data still lives in the existing workspace during this stage.
    // The client derives these counters from that workspace, not from fixtures.
    students: 0, progress: 0,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function fields(input: z.infer<typeof courseInputSchema>) {
  return { title: input.title, description: input.description, category: input.category,
    level: input.level, status: input.status, language: input.language ?? "uz",
    sequential: input.sequential ?? false, cover_image: input.coverImage ?? "" };
}

// Authorization is checked here as well as by SQL RLS; the actor is supplied
// only by server actions after getCurrentProfile(), never by a client payload.
export function createSupabaseCourseRepository(client: SupabaseClient, actor: CourseActor | null) {
  const active = !!actor && actor.status === "active" && ["owner", "admin", "student"].includes(actor.role);
  const staff = active && (actor!.role === "owner" || actor!.role === "admin");
  const denied = { ok: false as const, message: "Bu amal uchun faol administrator hisobiga kiring." };
  async function read(): Promise<CourseListResult> {
    if (!active) return { ok: false, message: "Sessiya tugagan yoki hisob faol emas. Qayta kiring." };
    try {
      const courses: Course[] = [];
      for (let offset = 0; ; offset += 100) {
        let query = client.from("courses").select(columns).order("updated_at", { ascending: false }).order("id");
        if (!staff) query = query.eq("status", "published");
        const { data, error } = await query.range(offset, offset + 99);
        if (error) return { ok: false, message: courseDatabaseError(error) };
        courses.push(...(data ?? []).map(mapCourseRow));
        if (!data || data.length < 100) break;
      }
      return { ok: true, courses };
    } catch { return { ok: false, message: courseDatabaseError(null) }; }
  }
  async function save(input: unknown, existing?: unknown): Promise<CourseResult> {
    if (!staff) return denied;
    const parsed = courseInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
    const previous = existing === undefined ? undefined : existingSchema.safeParse(existing);
    if (previous && !previous.success) return { ok: false, message: "Kurs identifikatori yoki tahrir vaqti noto‘g‘ri." };
    try {
      const table = client.from("courses");
      const query = previous?.success
        ? table.update(fields(parsed.data)).eq("slug", previous.data.id).eq("updated_at", previous.data.updatedAt)
        : table.insert({ ...fields(parsed.data), slug: crypto.randomUUID(), instructor_id: actor!.id });
      const { data, error } = await query.select(columns).maybeSingle();
      if (error) return { ok: false, message: courseDatabaseError(error) };
      if (!data) return { ok: false, message: "Kurs boshqa oynada o‘zgargan. Sahifani yangilang; kiritgan matningiz saqlashgacha shu formada qoladi." };
      return { ok: true, course: mapCourseRow(data) };
    } catch { return { ok: false, message: courseDatabaseError(null) }; }
  }
  async function importCourse(input: unknown): Promise<CourseImportResult> {
    if (!staff) return denied;
    const parsed = courseSchema.safeParse(input);
    if (!parsed.success || !slugSchema.safeParse(parsed.data.id).success)
      return { ok: false, message: "Eski kurs formati yoki IDsi mos emas. Asl yozuv o‘zgartirilmadi." };
    try {
      const course = parsed.data;
      const { data, error } = await client.from("courses").upsert({
        ...fields(course), slug: course.id, instructor_id: actor!.id, created_at: course.createdAt,
      }, { onConflict: "slug", ignoreDuplicates: true }).select("slug");
      if (error) return { ok: false, message: courseDatabaseError(error) };
      return { ok: true, inserted: !!data?.length };
    } catch { return { ok: false, message: courseDatabaseError(null) }; }
  }
  return { read, save, importCourse };
}
