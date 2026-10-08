import type { Metadata } from "next";
import { StudentHome } from "@/features/workspace/student-pages";
export const metadata: Metadata = { title: "Student kabineti — Gradexa" };
export default function Page() {
  return <StudentHome />;
}
