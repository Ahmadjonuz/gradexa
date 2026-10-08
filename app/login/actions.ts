"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authFailure, authIssue, type AuthFormState } from "@/lib/auth-form-feedback";
import { safeLoginDestination } from "@/lib/auth-destination";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return authFailure(parsed.error.issues[0]?.path[0] === "email" ? "invalid_email" : "missing_password");
  }

  let destination: string;

  try {
    const supabase = await createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      parsed.data,
    );
    if (signInError) return authFailure(authIssue(signInError));
    if (!data.user || !data.session) return authFailure("unknown");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError) return authFailure(authIssue(profileError));
    if (!profile || !["owner", "admin", "student"].includes(profile.role)) {
      await supabase.auth.signOut();
      return authFailure("profile_missing");
    }
    if (profile.status !== "active") {
      await supabase.auth.signOut();
      return authFailure("profile_inactive");
    }

    destination = safeLoginDestination(formData.get("next"), profile.role === "student" ? "student" : "admin");
  } catch (error) {
    return authFailure(authIssue(error));
  }

  // Next.js redirects throw a control-flow exception; keep this outside catch.
  redirect(destination);
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}
