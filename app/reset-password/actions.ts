"use server";

import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/lib/auth-form-feedback";
import { saveAccountPassword } from "@/features/invitations/password";

export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return saveAccountPassword(createClient, formData);
}
