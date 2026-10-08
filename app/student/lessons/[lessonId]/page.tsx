import { LessonReader } from "@/features/workspace/lesson-reader";
export default async function Page({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return <LessonReader lessonId={lessonId} />;
}
