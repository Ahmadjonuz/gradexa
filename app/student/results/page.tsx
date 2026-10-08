import type { Metadata } from "next";
import { Results } from "@/features/workspace/results";
export const metadata: Metadata = { title: "Mening natijalarim — Gradexa" };
export default async function Page({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const { quiz } = await searchParams;
  return <Results student initialQuiz={quiz ?? "all"} />;
}
