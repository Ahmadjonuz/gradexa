/** Stage 1 fixtures. These are not authenticated or live records. */
export const owner = {
  name: "Ahmadjon Karimov",
  initials: "AK",
  role: "Owner",
};
export const statistics = [
  {
    label: "Total students",
    value: "248",
    detail: "Ta’lim olayotgan talabalar",
    icon: "students",
  },
  {
    label: "Active courses",
    value: "12",
    detail: "Faol o‘quv dasturlari",
    icon: "courses",
  },
  {
    label: "Completed lessons",
    value: "1,286",
    detail: "Yakunlangan darslar",
    icon: "lessons",
  },
  {
    label: "Completion rate",
    value: "76.4%",
    detail: "Umumiy yakunlash darajasi",
    icon: "completion",
  },
] as const;
export const courses = [
  {
    id: "frontend",
    name: "Frontend Foundations",
    students: 84,
    progress: 82,
    category: "HTML · CSS · Responsive design",
    symbol: "</>",
  },
  {
    id: "javascript",
    name: "JavaScript: Zero to Pro",
    students: 71,
    progress: 68,
    category: "JavaScript · Amaliy loyihalar",
    symbol: "JS",
  },
  {
    id: "ui",
    name: "UI Systems",
    students: 52,
    progress: 54,
    category: "Komponentlar · Dizayn tizimlari",
    symbol: "UI",
  },
] as const;
export const tasks = [
  { id: "invitations", name: "Approve 12 pending invitations", time: "09:30" },
  { id: "report", name: "Review weekly progress report", time: "11:00" },
  { id: "publish", name: "Publish Frontend Foundations draft", time: "14:45" },
] as const;
export const students = [
  { name: "Aziza Rasulova", course: "Frontend Foundations" },
  { name: "Sardor Rahimov", course: "JavaScript: Zero to Pro" },
  { name: "Madina Usmonova", course: "UI Systems" },
] as const;
export const activity = [
  { day: "Du", lessons: 42 },
  { day: "Se", lessons: 65 },
  { day: "Ch", lessons: 51 },
  { day: "Pa", lessons: 92 },
  { day: "Ju", lessons: 76 },
  { day: "Sh", lessons: 115 },
  { day: "Ya", lessons: 96 },
];
export type Detail = { title: string; description: string };
