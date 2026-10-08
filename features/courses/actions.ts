"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseCourseRepository, courseDatabaseError, type CourseListResult, type CourseImportResult } from "./supabase-repository";
import type { CourseResult } from "./repository";

async function repository() {
  const profile = await getCurrentProfile();
  const client = await createClient();
  return createSupabaseCourseRepository(client, profile);
}
export async function readCoursesAction(): Promise<CourseListResult> {
  try { return await (await repository()).read(); }
  catch { return { ok: false, message: courseDatabaseError(null) }; }
}
export async function saveCourseAction(input: unknown, existing?: unknown): Promise<CourseResult> {
  try { return await (await repository()).save(input, existing); }
  catch { return { ok: false, message: courseDatabaseError(null) }; }
}
export async function importCourseAction(input: unknown): Promise<CourseImportResult> {
  try { return await (await repository()).importCourse(input); }
  catch { return { ok: false, message: courseDatabaseError(null) }; }
}
