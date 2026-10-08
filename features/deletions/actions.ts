"use server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { previewDeletion, deleteRecord, deletionError } from "./service";
import type { PreviewResult, DeletionResult } from "./model";
export async function previewDeletionAction(input: unknown): Promise<PreviewResult> {
  try { return await previewDeletion(await getCurrentProfile(), input, await createClient()); }
  catch (error) { return { ok: false, message: deletionError(error) }; }
}
export async function deleteRecordAction(input: unknown): Promise<DeletionResult> {
  try { return await deleteRecord(await getCurrentProfile(), input, await createClient(), createAdminClient); }
  catch (error) { return { ok: false, message: deletionError(error), refresh: true }; }
}
