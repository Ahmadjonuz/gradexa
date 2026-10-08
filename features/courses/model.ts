import { z } from "zod";
import { courses as dashboardCourses } from "@/lib/data/dashboard";

export const statusLabels = {
  draft: "Qoralama",
  published: "Nashr qilingan",
  archived: "Arxivda",
} as const;
export const levelLabels = {
  beginner: "Boshlang‘ich",
  intermediate: "O‘rta",
  advanced: "Yuqori",
} as const;
export const courseInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Kurs nomi kamida 3 belgi bo‘lsin.")
    .max(100, "Kurs nomi 100 belgidan oshmasin."),
  description: z
    .string()
    .trim()
    .min(10, "Tavsif kamida 10 belgi bo‘lsin.")
    .max(1500, "Tavsif 1500 belgidan oshmasin."),
  category: z
    .string()
    .trim()
    .min(2, "Yo‘nalishni kiriting.")
    .max(60, "Yo‘nalish 60 belgidan oshmasin."),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  status: z.enum(["draft", "published", "archived"]),
  language: z.enum(["uz", "en", "ru"]).optional(),
  sequential: z.boolean().optional(),
  coverImage: z.string().max(800000, "Muqova hajmi juda katta.").refine(
    value => !value || /^\/images\/gradexa\/[a-z0-9-]+\.png$/.test(value) || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
    "PNG, JPG yoki WEBP muqova tanlang.",
  ).optional(),
});
export const courseSchema = courseInputSchema.extend({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),
  students: z.number().int().min(0),
  progress: z.number().min(0).max(100),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export const courseFileSchema = z.object({
  version: z.literal(1),
  courses: z
    .array(courseSchema)
    .max(500)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Kurs identifikatorlari takrorlanmasin.",
    ),
});
export type Course = z.infer<typeof courseSchema>;
export type CourseInput = z.infer<typeof courseInputSchema>;
export type CourseStatus = Course["status"];
export const seedCourses: Course[] = dashboardCourses.map((course, index) => ({
  id: course.id,
  title: course.name,
  category: index === 2 ? "Dizayn" : "Dasturlash",
  description: `${course.category}. Amaliy mashqlar orqali mustahkam bilim oling va mustaqil loyiha yaratishga tayyorlaning.`,
  level: index === 2 ? "intermediate" : "beginner",
  status: "published",
  students: course.students,
  progress: course.progress,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
}));
export function filterCourses(
  courses: Course[],
  query: string,
  status: string,
  sort: string,
): Course[] {
  const normalized = query.trim().toLocaleLowerCase("uz");
  const filtered = courses.filter(
    (course) =>
      (status === "all" || course.status === status) &&
      `${course.title} ${course.category} ${course.description}`
        .toLocaleLowerCase("uz")
        .includes(normalized),
  );
  return filtered.sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "students"
        ? b.students - a.students
        : b.updatedAt.localeCompare(a.updatedAt),
  );
}
