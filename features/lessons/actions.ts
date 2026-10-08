"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createSupabaseLessonRepository,
  lessonDatabaseError,
  type LessonImportResult,
  type LessonListResult,
  type LessonSaveResult,
} from "./supabase-repository";

async function repository() {
  const profile = await getCurrentProfile();
  const client = await createClient();
  return createSupabaseLessonRepository(client, profile);
}

export async function readLessonsAction(): Promise<LessonListResult> {
  try {
    return await (await repository()).read();
  } catch {
    return { ok: false, message: lessonDatabaseError(null) };
  }
}

export async function saveLessonAction(
  input: unknown,
  existing?: unknown,
): Promise<LessonSaveResult> {
  try {
    return await (await repository()).save(input, existing);
  } catch {
    return { ok: false, message: lessonDatabaseError(null) };
  }
}

export async function importLessonAction(
  input: unknown,
): Promise<LessonImportResult> {
  try {
    return await (await repository()).importLesson(input);
  } catch {
    return { ok: false, message: lessonDatabaseError(null) };
  }
}
