import { createCourseRepository, COURSE_STORAGE_KEY, type StoragePort } from "./repository";
import { WORKSPACE_KEY } from "@/features/workspace/repository";

export function readLegacyCourses(storage: StoragePort) {
  const source = storage.getItem(COURSE_STORAGE_KEY) === null ? "sample" as const : "saved" as const;
  return { ...createCourseRepository(storage).read(), source };
}

// Deliberately select only the two Gradexa data keys. Auth tokens and all other
// localStorage entries must never be exported or sent to the import action.
export function makeCourseBackup(storage: StoragePort) {
  const legacy = readLegacyCourses(storage);
  if (legacy.error) throw new Error(legacy.error);
  return JSON.stringify({
    format: "gradexa-courses-before-supabase", version: 1, createdAt: new Date().toISOString(),
    source: legacy.source,
    entries: { [COURSE_STORAGE_KEY]: storage.getItem(COURSE_STORAGE_KEY), [WORKSPACE_KEY]: storage.getItem(WORKSPACE_KEY) },
    displayedCourses: legacy.courses,
  }, null, 2);
}
