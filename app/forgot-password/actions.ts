"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authFailure, authIssue, type AuthFormState } from "@/lib/auth-form-feedback";
import { publicHref, readLanguage, type PublicLanguage } from "@/lib/public-language";

const emailSchema = z.object({
  email: z.string().trim().email("Email manzilini to‘g‘ri kiriting."),
});

function getResetRedirectUrl(language: PublicLanguage) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!siteUrl) {
    throw new Error("Site configuration is missing.");
  }

  let url: URL;
  try { url = new URL(siteUrl); }
  catch { throw new Error("Invalid site configuration."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid site configuration.");
  }

  // Preserve the working Uzbek callback URL already configured in Supabase.
  if (language === "uz") return new URL("/auth/callback?next=/reset-password", url).toString();
  const callback = new URL("/auth/callback", url);
  callback.searchParams.set("next", publicHref("/reset-password", language));
  callback.searchParams.set("lang", language);
  return callback.toString();
}

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return authFailure("invalid_email");
  }

  try {
    const redirectTo = getResetRedirectUrl(readLanguage(formData.get("language")));
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo },
    );

    if (error) {
      return authFailure(authIssue(error));
    }
  } catch (error) {
    return authFailure(authIssue(error));
  }

  // Keep the response identical whether or not an account exists.
  return {
    error: null,
    success:
      "Agar bu email uchun hisob mavjud bo‘lsa, parolni tiklash havolasi yuborildi.",
  };
}
