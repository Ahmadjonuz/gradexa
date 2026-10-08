import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapCourseRow } from "./supabase-repository";
import type { Course } from "./model";
export async function readPublicCatalog(): Promise<{ courses: Course[]; unavailable: boolean }> {
  try {
    const client = await createClient();
    const { data, error } = await client.from("courses")
      .select("slug,title,description,category,level,status,language,sequential,cover_image,created_at,updated_at")
      .eq("status", "published").order("updated_at", { ascending: false }).order("id").limit(3);
    if (error) return { courses: [], unavailable: true };
    return { courses: (data ?? []).map(mapCourseRow), unavailable: false };
  } catch { return { courses: [], unavailable: true }; }
}
