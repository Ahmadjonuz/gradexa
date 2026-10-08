import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { studentSchema } from "@/features/workspace/model";

type Actor = { id: string; role: string; status: string } | null;
export type InvitationResult = { ok: true; message: string } | { ok: false; message: string; persisted?: boolean };
const inputSchema = studentSchema.extend({ id: z.string().uuid(), status: z.literal("invited"), courseIds: z.array(z.string()).min(1).max(500) });
const dispatchSchema = z.object({ id: z.string().uuid(), claim: z.string().uuid(), token: z.string().uuid(), email: z.string().email(), name: z.string() });

export function invitationRedirect(siteUrl: string | undefined) {
  try {
    const site = new URL(siteUrl?.trim() ?? "");
    if (!["http:", "https:"].includes(site.protocol) || site.username || site.password || site.search || site.hash || site.pathname !== "/") return null;
    const callback = new URL("/auth/callback", site);
    callback.searchParams.set("next", "/accept-invitation");
    return callback.toString();
  } catch { return null; }
}

export function invitationError(error: unknown) {
  const e = error as { code?: string; message?: string; status?: number } | null;
  if (e?.message?.startsWith("GRADEXA: ")) return e.message.slice(9);
  if (["PGRST202", "42P01", "42703", "42883"].includes(e?.code ?? "")) return "GRADEXA-INVITATIONS-UPDATE.sql faylini mavjud Supabase SQL Editor’da bajaring.";
  if (e?.status === 429 || /rate_limit/.test(e?.code ?? "")) return "Email yuborish limiti tugagan. Biroz kutib qayta yuboring.";
  if (e?.code === "email_exists" || e?.code === "user_already_exists") return "Bu email uchun hisob mavjud. Talabalar ro‘yxatini yangilang; mavjud hisobni tahrirlang.";
  if (e?.code === "email_address_not_authorized" || /not authorized|smtp|sending.*email/i.test(e?.message ?? "")) return "Email xizmati xatni yubormadi. Supabase SMTP va jo‘natuvchi email sozlamalarini tekshiring.";
  if (e?.code === "42501" || e?.status === 401 || e?.status === 403) return "Taklif uchun faol admin hisobi va serverdagi Supabase secret key sozlamasi kerak.";
  return "Taklif yuborilgani tasdiqlanmadi. Ulanish va Supabase Auth loglarini tekshirib, qayta urinib ko‘ring.";
}

// The admin factory is deliberately lazy: unauthorized callers never obtain a privileged client.
export async function sendStudentInvitation(actor: Actor, input: unknown, siteUrl: string | undefined, adminFactory: () => SupabaseClient): Promise<InvitationResult> {
  if (!actor || actor.status !== "active" || !["owner", "admin"].includes(actor.role)) return { ok: false, message: "Taklif yuborish uchun faol administrator hisobi kerak." };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ism, to‘g‘ri email va kamida bitta kursni kiriting." };
  const redirectTo = invitationRedirect(siteUrl);
  if (!redirectTo) return { ok: false, message: "NEXT_PUBLIC_SITE_URL saytning to‘liq manzili bo‘lishi kerak. Masalan, shu kompyuterdagi sinov uchun http://localhost:3000." };
  let client: SupabaseClient;
  try { client = adminFactory(); }
  catch { return { ok: false, message: "Serverda SUPABASE_SECRET_KEY yoki Supabase ulanish sozlamasi topilmadi. Qiymatni faqat o‘zingizning .env.local faylingizga kiriting." }; }
  let dispatch: z.infer<typeof dispatchSchema>;
  try {
    const prepared = await client.rpc("gradexa_prepare_invitation", { p_actor: actor.id, p_data: parsed.data });
    if (prepared.error) return { ok: false, message: invitationError(prepared.error) };
    dispatch = dispatchSchema.parse(prepared.data);
  } catch (error) { return { ok: false, message: invitationError(error) }; }
  let userId: string | null = null;
  let sendError: unknown;
  try {
    const result = await client.auth.admin.inviteUserByEmail(dispatch.email, {
      redirectTo,
      data: { full_name: dispatch.name, gradexa_invitation_id: dispatch.id, gradexa_invitation_token: dispatch.token },
    });
    sendError = result.error;
    userId = result.data?.user?.id ?? null;
    if (!sendError && !userId) sendError = new Error("Missing invited user");
  } catch (error) { sendError = error; }
  try {
    const finished = await client.rpc("gradexa_finish_invitation", {
      p_id: dispatch.id, p_claim: dispatch.claim, p_user: userId, p_sent: !sendError,
    });
    if (finished.error) return { ok: false, persisted: true, message: sendError ? invitationError(sendError) : "Email yuborish xizmati taklifni qabul qildi, lekin bazadagi holat tasdiqlanmadi. Sahifani yangilang. Talaba kelgan havoladan davom etishi mumkin." };
  } catch { return { ok: false, persisted: true, message: "Yuborish natijasini bazaga yozib bo‘lmadi. Sahifani yangilang; taklif kelgan bo‘lsa, talaba havoladan davom etsin." }; }
  return sendError ? { ok: false, persisted: true, message: invitationError(sendError) } : { ok: true, message: "Taklif email xizmatiga yuborildi. Talaba xatdagi havola orqali parol o‘rnatadi." };
}
