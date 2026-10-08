import {
  courseFileSchema,
  courseInputSchema,
  seedCourses,
  type Course,
  type CourseInput,
} from "./model";

export const COURSE_STORAGE_KEY = "gradexa.v2.courses.v1";
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export type CourseResult =
  | { ok: true; course: Course }
  | { ok: false; message: string };
export type CourseSnapshot = {
  courses: Course[];
  ready: boolean;
  error: string | null;
};

/** Device-local repository. Replace this adapter when the server API is introduced. */
export function createCourseRepository(storage: StoragePort) {
  function read(): CourseSnapshot {
    try {
      const raw = storage.getItem(COURSE_STORAGE_KEY);
      if (raw === null)
        return { courses: seedCourses, ready: true, error: null };
      const parsed = courseFileSchema.safeParse(JSON.parse(raw));
      if (!parsed.success)
        return {
          courses: [],
          ready: true,
          error:
            "Saqlangan kurslar formati mos kelmadi. Ma’lumot o‘zgartirilmadi; saqlash vaqtincha to‘xtatildi.",
        };
      return { courses: parsed.data.courses, ready: true, error: null };
    } catch {
      return {
        courses: [],
        ready: true,
        error:
          "Brauzerdagi kurslarni o‘qib bo‘lmadi. Brauzer saqlash ruxsatini tekshirib, qayta urinib ko‘ring.",
      };
    }
  }
  function save(
    input: CourseInput,
    existing?: { id: string; updatedAt: string },
  ): CourseResult {
    const parsed = courseInputSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, message: parsed.error.issues[0].message };
    const snapshot = read();
    if (snapshot.error) return { ok: false, message: snapshot.error };
    const previous = existing
      ? snapshot.courses.find((course) => course.id === existing.id)
      : undefined;
    if (existing && (!previous || previous.updatedAt !== existing.updatedAt)) {
      return {
        ok: false,
        message:
          "Kurs boshqa oynada o‘zgargan. Tahrirlashni yoping va yangilangan kursni qayta oching.",
      };
    }
    if (!existing && snapshot.courses.length >= 500)
      return {
        ok: false,
        message: "Mahalliy namuna rejimida 500 tagacha kurs saqlash mumkin.",
      };
    const timestamp = new Date(
      Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0),
    ).toISOString();
    const course: Course = {
      ...parsed.data,
      id: previous?.id ?? crypto.randomUUID(),
      students: previous?.students ?? 0,
      progress: previous?.progress ?? 0,
      createdAt: previous?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const courses = previous
      ? snapshot.courses.map((item) => (item.id === course.id ? course : item))
      : [course, ...snapshot.courses];
    try {
      storage.setItem(
        COURSE_STORAGE_KEY,
        JSON.stringify({ version: 1, courses }),
      );
      return { ok: true, course };
    } catch {
      return {
        ok: false,
        message:
          "Saqlanmadi. Brauzer xotirasi to‘lgan yoki saqlash bloklangan. Kiritgan matningiz shu oynada qoladi.",
      };
    }
  }
  return { read, save };
}
