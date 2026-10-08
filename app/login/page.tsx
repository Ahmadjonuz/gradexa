import type { Metadata } from "next";
import { LoginAccess } from "@/features/workspace/access";
import { readLanguage } from "@/lib/public-language";
export const metadata: Metadata = { title: "Kirish — Gradexa" };
export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string; next?: string | string[] }> }) {
  const params = await searchParams;
  return <LoginAccess initialLanguage={readLanguage(params.lang)} initialNext={typeof params.next === "string" ? params.next : undefined} />;
}
