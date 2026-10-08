import type { Metadata } from "next";
import { ForgotPasswordAccess } from "@/features/workspace/password-recovery";
import { readLanguage } from "@/lib/public-language";

export const metadata: Metadata = { title: "Parolni tiklash — Gradexa" };

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string; reason?: string }> }) {
  const params = await searchParams;
  const issue = params.reason === "expired" ? "expired" : params.reason === "connection" ? "connection" : undefined;
  return <ForgotPasswordAccess initialLanguage={readLanguage(params.lang)} initialIssue={issue} />;
}
