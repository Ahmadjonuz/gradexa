import type { Attempt } from "./model";

export function answerCounts(attempt: Attempt) {
  let correct = 0, incorrect = 0, unanswered = 0;
  attempt.questions.forEach((question, index) => {
    const answer = attempt.answers[index];
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) unanswered++;
    else if (answer === question.correct) correct++;
    else incorrect++;
  });
  return { correct, incorrect, unanswered, total: attempt.questions.length };
}
export function initials(name: string) {
  return name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
}
export function formatDate(value: string, time = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("uz-UZ", { year: "numeric", month: "short", day: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } as const : {}), timeZone: "Asia/Tashkent" }).format(date);
}
export function resultsCsv(attempts: Attempt[], courseNames: Record<string, string>) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + [["Talaba", "Kurs", "Test", "To‘g‘ri", "Savollar", "Ball (%)", "Holat", "Sana (UTC)"], ...attempts.map(a => [a.studentName, courseNames[a.courseId] ?? a.courseId, a.title, answerCounts(a).correct, a.questions.length, a.score, a.score >= a.passScore ? "O‘tgan" : "O‘tmagan", a.createdAt])].map(row => row.map(cell).join(",")).join("\r\n");
}
export function downloadResults(attempts: Attempt[], courseNames: Record<string, string>) {
  const url = URL.createObjectURL(new Blob([resultsCsv(attempts, courseNames)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "gradexa-test-natijalari.csv";
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
