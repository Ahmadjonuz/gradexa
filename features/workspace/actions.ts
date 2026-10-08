"use server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseWorkspaceRepository, workspaceDatabaseError, type WorkspaceCommand, type ReadResult, type WriteResult } from "./supabase-repository";
export async function readWorkspaceAction(): Promise<ReadResult> {
  try { return await createSupabaseWorkspaceRepository(await createClient(), await getCurrentProfile()).read(); }
  catch { return { ok: false, message: workspaceDatabaseError(null) }; }
}
export async function writeWorkspaceAction(kind: WorkspaceCommand, input: unknown): Promise<WriteResult> {
  try { return await createSupabaseWorkspaceRepository(await createClient(), await getCurrentProfile()).write(kind, input); }
  catch { return { ok: false, message: workspaceDatabaseError(null) }; }
}
