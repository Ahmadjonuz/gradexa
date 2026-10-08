"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  createSupabaseEnrollmentRepository,
  enrollmentDatabaseError,
  type EnrollResult,
  type EnrollmentListResult,
} from "./supabase-repository";

async function repository() {
  const profile = await getCurrentProfile();
  const client = await createClient();
  return createSupabaseEnrollmentRepository(client, profile);
}

export async function readMyEnrollmentsAction(): Promise<EnrollmentListResult> {
  try {
    return await (await repository()).readOwn();
  } catch {
    return { ok: false, message: enrollmentDatabaseError(null) };
  }
}

export async function enrollInCourseAction(courseId: unknown): Promise<EnrollResult> {
  try {
    return await (await repository()).enroll(courseId);
  } catch {
    return { ok: false, message: enrollmentDatabaseError(null) };
  }
}
