import type { Metadata } from "next";
import { ResetPasswordAccess } from "@/features/workspace/password-recovery";
import { readLanguage } from "@/lib/public-language";
import { createClient } from "@/lib/supabase/server";
import { authIssue } from "@/lib/auth-form-feedback";

export const metadata: Metadata = { title: "Yangi parol — Gradexa" };

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = readLanguage((await searchParams).lang);
  let sessionState: "valid" | "expired" | "unavailable" = "expired";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    sessionState = data.user && !error ? "valid" : authIssue(error) === "connection" ? "unavailable" : "expired";
  } catch {
    sessionState = "unavailable";
  }
  return <ResetPasswordAccess initialLanguage={language} sessionState={sessionState} />;
}
