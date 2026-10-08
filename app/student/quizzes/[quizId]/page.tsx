import { QuizRunner } from "@/features/workspace/student-quizzes";
export default async function Page({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  return <QuizRunner quizId={quizId} />;
}
