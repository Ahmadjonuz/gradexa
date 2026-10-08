import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lessonSchema, type Lesson } from "@/features/workspace/model";

const columns =
  "id,external_id,course_id,module_title,title,body,video_url,duration_minutes,position,is_published,created_at,updated_at,courses!inner(slug,status)";
const externalIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9-]+$/);
const existingSchema = z.object({
  id: externalIdSchema,
  updatedAt: z.string().datetime({ offset: true }),
});

export type LessonActor = { id: string; role: string; status: string };
export type LessonListResult =
  | { ok: true; lessons: Lesson[] }
  | { ok: false; message: string };
export type LessonSaveResult =
  | { ok: true; lesson: Lesson }
  | { ok: false; message: string };
export type LessonImportResult =
  | { ok: true; inserted: boolean }
  | { ok: false; message: string };

export function lessonDatabaseError(error: { code?: string } | null) {
  if (
    ["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"].includes(
      error?.code ?? "",
    )
  )
    return "Darslar bazasi tayyor emas. Supabase’da 202610020002_lessons_data_layer.sql faylini bajaring.";
  if (error?.code === "42501")
    return "Darslar uchun Supabase RLS ruxsatlarini tekshiring. SQL yangilanishi bajarilgan bo‘lishi kerak.";
  if (error?.code === "23505")
    return "Bu modulda shu tartib raqamli dars yoki shu IDli yozuv allaqachon mavjud.";
  return "Supabase bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.";
}

function relatedCourse(row: Record<string, unknown>) {
  const relation = row.courses;
  const course = Array.isArray(relation) ? relation[0] : relation;
  return z
    .object({ slug: externalIdSchema, status: z.string() })
    .parse(course);
}

export function mapLessonRow(row: Record<string, unknown>): Lesson {
  const course = relatedCourse(row);
  return lessonSchema.parse({
    id: row.external_id,
    courseId: course.slug,
    title: row.title,
    module: row.module_title,
    body: row.body,
    videoUrl: row.video_url,
    minutes: row.duration_minutes,
    order: row.position,
    published: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function fields(lesson: Lesson, courseId: string) {
  return {
    course_id: courseId,
    module_title: lesson.module,
    title: lesson.title,
    body: lesson.body,
    video_url: lesson.videoUrl,
    duration_minutes: lesson.minutes,
    position: lesson.order,
    is_published: lesson.published,
  };
}

export function createSupabaseLessonRepository(
  client: SupabaseClient,
  actor: LessonActor | null,
) {
  const active =
    !!actor &&
    actor.status === "active" &&
    ["owner", "admin", "student"].includes(actor.role);
  const staff =
    active && (actor!.role === "owner" || actor!.role === "admin");
  const denied = {
    ok: false as const,
    message: "Bu amal uchun faol administrator hisobiga kiring.",
  };

  async function findCourse(courseSlug: string) {
    try {
      const { data, error } = await client
        .from("courses")
        .select("id,slug,status")
        .eq("slug", courseSlug)
        .maybeSingle();
      if (error)
        return { ok: false as const, message: lessonDatabaseError(error) };
      if (!data)
        return {
          ok: false as const,
          message: "Tanlangan kurs Supabase bazasida topilmadi.",
        };
      return { ok: true as const, id: String(data.id) };
    } catch {
      return { ok: false as const, message: lessonDatabaseError(null) };
    }
  }

  async function read(): Promise<LessonListResult> {
    if (!active)
      return {
        ok: false,
        message: "Sessiya tugagan yoki hisob faol emas. Qayta kiring.",
      };
    try {
      const lessons: Lesson[] = [];
      for (let offset = 0; ; offset += 100) {
        let query = client
          .from("lessons")
          .select(columns)
          .order("course_id")
          .order("module_title")
          .order("position")
          .order("id");
        if (!staff)
          query = query
            .eq("is_published", true)
            .eq("courses.status", "published");
        const { data, error } = await query.range(offset, offset + 99);
        if (error) return { ok: false, message: lessonDatabaseError(error) };
        lessons.push(...(data ?? []).map(mapLessonRow));
        if (!data || data.length < 100) break;
      }
      return { ok: true, lessons };
    } catch {
      return { ok: false, message: lessonDatabaseError(null) };
    }
  }

  async function save(
    input: unknown,
    existing?: unknown,
  ): Promise<LessonSaveResult> {
    if (!staff) return denied;
    const parsed = lessonSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, message: parsed.error.issues[0].message };
    if (!externalIdSchema.safeParse(parsed.data.id).success)
      return { ok: false, message: "Dars identifikatori noto‘g‘ri." };
    const previous =
      existing === undefined ? undefined : existingSchema.safeParse(existing);
    if (previous && !previous.success)
      return {
        ok: false,
        message: "Dars identifikatori yoki tahrir vaqti noto‘g‘ri.",
      };
    const course = await findCourse(parsed.data.courseId);
    if (!course.ok) return course;
    try {
      const table = client.from("lessons");
      const payload = fields(parsed.data, course.id);
      const query = previous?.success
        ? table
            .update(payload)
            .eq("external_id", previous.data.id)
            .eq("updated_at", previous.data.updatedAt)
        : table.insert({ ...payload, external_id: parsed.data.id });
      const { data, error } = await query.select(columns).maybeSingle();
      if (error) return { ok: false, message: lessonDatabaseError(error) };
      if (!data)
        return {
          ok: false,
          message:
            "Dars boshqa oynada o‘zgargan. Sahifani yangilang; kiritgan matningiz shu formada qoladi.",
        };
      return { ok: true, lesson: mapLessonRow(data) };
    } catch {
      return { ok: false, message: lessonDatabaseError(null) };
    }
  }

  async function importLesson(input: unknown): Promise<LessonImportResult> {
    if (!staff) return denied;
    const parsed = lessonSchema.safeParse(input);
    if (
      !parsed.success ||
      !externalIdSchema.safeParse(parsed.data.id).success
    )
      return {
        ok: false,
        message: "Eski dars formati yoki IDsi mos emas. Asl yozuv o‘zgartirilmadi.",
      };
    const course = await findCourse(parsed.data.courseId);
    if (!course.ok) return course;
    try {
      const lesson = parsed.data;
      const { data, error } = await client
        .from("lessons")
        .upsert(
          {
            ...fields(lesson, course.id),
            external_id: lesson.id,
            ...(lesson.createdAt ? { created_at: lesson.createdAt } : {}),
          },
          { onConflict: "external_id", ignoreDuplicates: true },
        )
        .select("external_id");
      if (error) return { ok: false, message: lessonDatabaseError(error) };
      return { ok: true, inserted: !!data?.length };
    } catch {
      return { ok: false, message: lessonDatabaseError(null) };
    }
  }

  return { read, save, importLesson };
}
