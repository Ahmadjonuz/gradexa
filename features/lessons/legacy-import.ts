import type { StoragePort } from "@/features/courses/repository";
import {
  WORKSPACE_KEY,
  workspaceRepository,
} from "@/features/workspace/repository";

export function readLegacyLessons(storage: StoragePort) {
  const source =
    storage.getItem(WORKSPACE_KEY) === null
      ? ("sample" as const)
      : ("saved" as const);
  const result = workspaceRepository(storage).read();
  return {
    lessons: result.error ? [] : result.data.lessons,
    error: result.error,
    source,
  };
}

export function makeLessonBackup(storage: StoragePort) {
  const legacy = readLegacyLessons(storage);
  if (legacy.error) throw new Error(legacy.error);
  return JSON.stringify(
    {
      format: "gradexa-lessons-before-supabase",
      version: 1,
      createdAt: new Date().toISOString(),
      source: legacy.source,
      entries: { [WORKSPACE_KEY]: storage.getItem(WORKSPACE_KEY) },
      displayedLessons: legacy.lessons,
    },
    null,
    2,
  );
}
