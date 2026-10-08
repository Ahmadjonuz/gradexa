import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deletionTarget, deletionInput, deletionPreview, type PreviewResult, type DeletionResult } from "./model";
type Actor = { id: string; role: string; status: string } | null;
const staff = (actor: Actor) => !!actor && actor.status === "active" && ["admin", "owner"].includes(actor.role);
export function deletionError(error: unknown) {
  const e = error as { code?: string; message?: string } | null;
  if (e?.message?.startsWith("GRADEXA: ")) return e.message.slice(9);
  if (["PGRST202", "PGRST204", "42P01", "42703", "42883"].includes(e?.code ?? "")) return "Avval GRADEXA-DELETE-UPDATE.sql faylini Supabase SQL Editor’da bajaring.";
  if (e?.code === "23503") return "Yozuvga boshqa ma’lumotlar bog‘langan. Ro‘yxatni yangilang; kursni arxivlash yoki testni qoralamaga olish mumkin.";
  if (e?.code === "42501") return "Faol administrator huquqi kerak. Qayta kiring.";
  return "O‘chirish tasdiqlanmadi. Ro‘yxatni yangilab tekshiring va qayta urinib ko‘ring.";
}
export async function previewDeletion(actor: Actor, input: unknown, client: SupabaseClient): Promise<PreviewResult> {
  if (!staff(actor)) return { ok: false, message: "O‘chirish uchun faol administrator hisobi kerak." };
  const parsed = deletionTarget.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Yozuv turi yoki identifikatori noto‘g‘ri." };
  try {
    const { data, error } = await client.rpc("gradexa_deletion_preview", { p_kind: parsed.data.kind, p_id: parsed.data.id });
    if (error) return { ok: false, message: deletionError(error) };
    const preview = deletionPreview.parse(data);
    if (preview.kind !== parsed.data.kind || preview.id !== parsed.data.id) throw new Error("Mismatched target");
    return { ok: true, preview };
  } catch (error) { return { ok: false, message: deletionError(error) }; }
}
export async function deleteRecord(actor: Actor, input: unknown, client: SupabaseClient, adminFactory: () => SupabaseClient): Promise<DeletionResult> {
  if (!staff(actor)) return { ok: false, message: "O‘chirish uchun faol administrator hisobi kerak." };
  const parsed = deletionInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "O‘chirishni nomini yozib tasdiqlang." };
  const value = parsed.data;
  const current = await previewDeletion(actor, value, client);
  if (!current.ok) return current;
  if (current.preview.blocked) return { ok: false, message: current.preview.blocked };
  if (current.preview.fingerprint !== value.fingerprint || current.preview.name !== value.confirmation) return { ok: false, message: "Ma’lumotlar o‘zgargan yoki tasdiqlash nomi mos emas. Qayta tekshiring." };
  const args = { p_kind: value.kind, p_id: value.id, p_fingerprint: value.fingerprint, p_confirmation: value.confirmation };
  if (!current.preview.authAccount) {
    try {
      const { data, error } = await client.rpc("gradexa_delete_record", args);
      if (error) return { ok: false, message: deletionError(error) };
      if (data?.ok !== true) return { ok: false, message: deletionError(null) };
      return { ok: true, message: "Yozuv Supabase’dan o‘chirildi." };
    } catch (error) { return { ok: false, message: deletionError(error), refresh: true }; }
  }
  if (!["student", "invitation"].includes(value.kind)) return { ok: false, message: "Hisob turi mos emas." };
  let admin: SupabaseClient;
  try { admin = adminFactory(); }
  catch { return { ok: false, message: "Serverdagi mavjud SUPABASE_SECRET_KEY sozlamasini tekshiring. Maxfiy qiymatni chatga yubormang." }; }
  let prepared: { userId: string; requestId: string; canRestore: boolean };
  try {
    const { data, error } = await admin.rpc("gradexa_prepare_student_delete", { p_actor: actor!.id, ...args });
    if (error) return { ok: false, message: deletionError(error) };
    prepared = z.object({ userId: z.string().uuid(), requestId: z.string().uuid(), canRestore: z.boolean() }).parse(data);
    if (prepared.userId === actor!.id) throw new Error("Self deletion rejected");
  } catch (error) { return { ok: false, message: deletionError(error), refresh: true }; }
  let failure: { code?: string; status?: number } | null = null;
  try {
    // Hard delete, following Supabase's server-only Admin API. IDs come from
    // the checked database operation, never from client-supplied Auth metadata.
    const result = await admin.auth.admin.deleteUser(prepared.userId, false);
    if (!result.error || result.error.code === "user_not_found") return { ok: true, message: "Talabaning login hisobi va unga bog‘langan o‘quv yozuvlari o‘chirildi." };
    failure = result.error;
  } catch { /* A timeout may happen after Auth commits. Reconcile below. */ }
  try {
    const check = await admin.auth.admin.getUserById(prepared.userId);
    if (check.error?.code === "user_not_found") return { ok: true, message: "Talaba hisobi o‘chirilgani tasdiqlandi." };
  } catch { /* Keep the account paused until a retry confirms the outcome. */ }
  if (prepared.canRestore && failure?.status && failure.status >= 400 && failure.status < 500) {
    try {
      const restored = await admin.rpc("gradexa_abort_student_delete", { p_actor: actor!.id, p_user: prepared.userId, p_request: prepared.requestId });
      if (!restored.error && restored.data?.restored === true) return { ok: false, refresh: true, message: "Supabase Auth o‘chirishni rad etdi. Talabaning avvalgi holati tiklandi. Server ruxsatlari va Auth loglarini tekshiring." };
    } catch { /* Never claim a rollback that was not confirmed. */ }
  }
  return { ok: false, refresh: true, message: "O‘chirish natijasi tasdiqlanmadi. Talaba hisobi vaqtincha to‘xtatildi. Ro‘yxatdagi talabaning o‘chirish oynasini qayta ochib davom eting; Auth loglari va hisobga tegishli Storage fayllarini ham tekshiring." };
}
