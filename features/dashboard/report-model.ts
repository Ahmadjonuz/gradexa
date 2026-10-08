import type { Course } from "@/features/courses/model";
import { studentProgress, type WorkspaceData } from "@/features/workspace/model";
import { calendarDay, reportDate, reportTime } from "@/lib/report-time";

export type CourseRow = { id: string; name: string; students: number; progress: number };
export type TrendPoint = { date: string; active: number; activity: number };
export type FunnelStep = { label: string; value: number };

// Explicit design previews only; live reports never fall back to these fixtures.
export const sampleCourses: CourseRow[] = [
  { id: "frontend", name: "Frontend Foundations", students: 84, progress: 82 },
  { id: "javascript", name: "JavaScript: Zero to Pro", students: 71, progress: 68 },
  { id: "ui", name: "UI Systems", students: 52, progress: 54 },
];
const active = [48,61,73,68,59,67,82,95,84,77,91,100,101,118,116,104,91,113,128,123,108,99,121,137,159,146,151,168,180,198];
const activity = [99,112,125,116,104,117,134,151,139,137,156,149,151,164,154,155,174,185,178,163,156,185,196,212,203,198,218,231,222,241];
export const sampleTrend: TrendPoint[] = active.map((value, i) => ({
  date: `2026-09-${String(i + 1).padStart(2, "0")}`, active: value, activity: activity[i],
}));
export const sampleFunnel: FunnelStep[] = [
  { label: "Ro‘yxatdan o‘tgan", value: 248 },
  { label: "Kurs boshlagan", value: 198 },
  { label: "Darslarni davom ettirgan", value: 146 },
  { label: "Kursni yakunlagan", value: 112 },
];
export const weekdays = ["Dush", "Sesh", "Chor", "Paysh", "Juma", "Shan", "Yak"];
export const sampleHeatmap = weekdays.map((_, day) => Array.from({ length: 24 }, (_, hour) =>
  hour < 6 ? (day + hour) % 3 : 8 + ((day * 19 + hour * 13) % 65),
));
export function percent(part: number, total: number) {
  return total > 0 ? Math.round(part / total * 100) : 0;
}

export function localReport(data: Pick<WorkspaceData, "students" | "lessons" | "completed" | "attempts">, courses: Course[], endDate: string, days: number) {
  data = { ...data, students: data.students.filter(student => !student.invitation) };
  const end = calendarDay(endDate) ?? calendarDay(reportDate())!;
  const count = Math.max(1, Math.min(30, Number.isFinite(days) ? Math.trunc(days) : 30));
  const start = end - (count - 1) * 86400000;
  const startDay = new Date(start).toISOString().slice(0, 10);
  const endDay = new Date(end).toISOString().slice(0, 10);
  const attempts = data.attempts.filter(a => {
    const day = reportDate(a.createdAt);
    return day >= startDay && day <= endDay;
  });
  const trend: TrendPoint[] = Array.from({ length: count }, (_, i) => {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
    const day = attempts.filter(a => reportDate(a.createdAt) === date);
    return { date, active: new Set(day.map(a => a.studentId)).size, activity: day.length };
  });
  const heatmap = weekdays.map(() => Array<number>(24).fill(0));
  attempts.forEach(a => {
    const local = reportTime(a.createdAt)!;
    const day = new Date(local.date + "T00:00:00Z").getUTCDay();
    heatmap[(day + 6) % 7][local.hour] += 1;
  });
  const rows: CourseRow[] = courses.map(c => {
    const members = data.students.filter(s => s.status === "active" && s.courseIds.includes(c.id));
    return {
      id: c.id, name: c.title, students: members.length,
      progress: members.length ? Math.round(members.reduce((sum, s) => sum + studentProgress(data, s.id, c.id).percent, 0) / members.length) : 0,
    };
  });
  let started = 0, continued = 0, finished = 0, completions = 0;
  for (const student of data.students) {
    const enrolled = courses.filter(c => student.courseIds.includes(c.id));
    const progress = enrolled.map(c => studentProgress(data, student.id, c.id));
    if (enrolled.length) started++;
    if (progress.some(p => p.completed > 0)) continued++;
    if (progress.some(p => p.total > 0 && p.completed === p.total)) finished++;
    completions += progress.reduce((sum, p) => sum + p.completed, 0);
  }
  return {
    trend, heatmap, courses: rows,
    active: new Set(attempts.map(a => a.studentId)).size,
    completions, attempts: attempts.length,
    score: attempts.length ? (attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length).toFixed(1) + "%" : "—",
    funnel: [
      { label: "Ro‘yxatdan o‘tgan", value: data.students.length },
      { label: "Kursga yozilgan", value: started },
      { label: "Dars yakunlagan", value: continued },
      { label: "Kursni yakunlagan", value: finished },
    ],
  };
}

export function reportCsv(source: string, trend: TrendPoint[], courses: CourseRow[], activityLabel = "Test urinishlari") {
  const escape = (value: string | number) => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows: (string | number)[][] = [
    ["Hisobot manbasi", source], ["Sana (Toshkent)", "Faol talabalar", activityLabel],
    ...trend.map(d => [d.date, d.active, d.activity]), [],
    ["Kurs", "Talabalar", "Yakunlash (%)"], ...courses.map(c => [c.name, c.students, c.progress]),
  ];
  return "\uFEFF" + rows.map(row => row.map(escape).join(",")).join("\r\n");
}
