"use server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStudentInvitation, invitationError, type InvitationResult } from "./service";

export async function sendInvitationAction(input: unknown): Promise<InvitationResult> {
  try { return await sendStudentInvitation(await getCurrentProfile(), input, process.env.NEXT_PUBLIC_SITE_URL, createAdminClient); }
  catch (error) { return { ok: false, message: invitationError(error) }; }
}
