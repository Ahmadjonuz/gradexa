import type { Course } from "./model";
import { studentProgress, type WorkspaceData } from "@/features/workspace/model";

// Counters derive from authorized server learning data.
// These counters are never persisted into the Supabase courses table.
export function withLearningStats(courses: Course[], data: Pick<WorkspaceData, "students" | "lessons" | "completed">): Course[] {
  return courses.map(course => {
    const enrolled = data.students.filter(student => student.status === "active" && student.courseIds.includes(course.id));
    const progress = enrolled.length ? Math.round(enrolled.reduce((sum, student) => sum + studentProgress(data, student.id, course.id).percent, 0) / enrolled.length) : 0;
    return { ...course, students: enrolled.length, progress };
  });
}
