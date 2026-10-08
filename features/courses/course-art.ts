export const courseArtwork = [
  { value: "/images/gradexa/course-frontend.png", label: "Frontend" },
  { value: "/images/gradexa/course-javascript.png", label: "JavaScript" },
  { value: "/images/gradexa/course-ui.png", label: "UI Systems" },
  { value: "/images/gradexa/learning-hero.png", label: "Bilim sari" },
];
export function courseCover(course: { id?: string; title: string; category?: string; coverImage?: string }) {
  if (course.coverImage) return course.coverImage;
  if (/javascript|typescript|\bjs\b/i.test(course.title)) return courseArtwork[1].value;
  if (/design|dizayn|\bui\b/i.test(course.title + " " + (course.category ?? ""))) return courseArtwork[2].value;
  if (/frontend|html|css|react|next/i.test(course.title)) return courseArtwork[0].value;
  return courseArtwork[3].value;
}
