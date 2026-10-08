import type { Metadata } from "next";
import { InvitationAccess } from "@/features/workspace/invitation";
import { createClient } from "@/lib/supabase/server";
import { readLanguage } from "@/lib/public-language";
import { authIssue } from "@/lib/auth-form-feedback";

export const metadata: Metadata = { title: "Taklifni qabul qilish — Gradexa", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string; reason?: string }> }) {
  const params = await searchParams;
  let sessionState: "valid" | "expired" | "unavailable" = params.reason === "connection" ? "unavailable" : "expired";
  let email = "";
  if (params.reason !== "expired") {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user?.email) { sessionState = "valid"; email = data.user.email; }
      else if (authIssue(error) === "connection") sessionState = "unavailable";
    } catch { sessionState = "unavailable"; }
  }
  return <InvitationAccess initialLanguage={readLanguage(params.lang)} email={email} sessionState={sessionState} />;
}
