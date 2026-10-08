import type { StoragePort } from "@/features/courses/repository";
import { WORKSPACE_KEY } from "./repository";
import { workspaceSchema } from "./model";
export function readLegacyWorkspace(storage: StoragePort) {
  const raw = storage.getItem(WORKSPACE_KEY);
  if (raw === null) return null;
  const parsed = workspaceSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("Eski workspace shakli mos emas. Asl yozuv o‘zgartirilmadi.");
  return parsed.data;
}
export function makeWorkspaceBackup(storage: StoragePort) {
  // Do not enumerate localStorage: it may contain authentication credentials.
  return JSON.stringify({ format: "gradexa-workspace-backup", version: 1, createdAt: new Date().toISOString(), entries: { [WORKSPACE_KEY]: storage.getItem(WORKSPACE_KEY) } }, null, 2);
}
