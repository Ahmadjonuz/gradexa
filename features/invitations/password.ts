import type { SupabaseClient } from "@supabase/supabase-js";
import { authFailure, authIssue, type AuthFormState } from "@/lib/auth-form-feedback";
import { passwordRequirements } from "@/lib/password-rules";

// Shared by the existing reset-password and accept-invitation forms.
export async function saveAccountPassword(clientFactory: () => Promise<SupabaseClient>, formData: FormData): Promise<AuthFormState> {
  const password = formData.get("password"), confirmation = formData.get("confirmation");
  if (typeof password !== "string" || !passwordRequirements(password).every(Boolean)) return authFailure("weak_password");
  if (password !== confirmation) return authFailure("password_mismatch");
  try {
    const client = await clientFactory();
    const { data, error: sessionError } = await client.auth.getUser();
    if (sessionError) { const issue = authIssue(sessionError); return authFailure(issue === "unknown" ? "expired" : issue); }
    if (!data.user) return authFailure("expired");
    const managed = typeof data.user.user_metadata?.gradexa_invitation_id === "string";
    const { error } = await client.auth.updateUser({ password });
    // Retrying after a successful password write + interrupted DB activation is safe.
    if (error && !(managed && authIssue(error) === "same_password")) return authFailure(authIssue(error));
    if (managed) {
      const activated = await client.rpc("gradexa_accept_invitation");
      if (activated.error) return { error: "Parol saqlandi, lekin taklifni yakunlab bo‘lmadi. Shu oynada qayta saqlang. Takrorlansa administratorga murojaat qiling.", success: null };
    }
    try { await client.auth.signOut(); } catch { /* Saved password stays valid. */ }
    return { error: null, success: "Parol yangilandi. Endi yangi parol bilan tizimga kiring." };
  } catch (error) { return authFailure(authIssue(error)); }
}
