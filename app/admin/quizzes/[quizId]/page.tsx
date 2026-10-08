import { QuizEditor } from "@/features/workspace/admin-quizzes";
export default async function Page({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  return <QuizEditor quizId={quizId} />;
}
