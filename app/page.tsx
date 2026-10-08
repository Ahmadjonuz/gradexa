import { PublicHome } from "@/features/workspace/home";
import { readLanguage } from "@/lib/public-language";
import { readPublicCatalog } from "@/features/courses/public-catalog";

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const catalog = await readPublicCatalog();
  return <PublicHome initialLanguage={readLanguage((await searchParams).lang)} courses={catalog.courses} unavailable={catalog.unavailable} />;
}
