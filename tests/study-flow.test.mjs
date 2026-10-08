import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, ws: false } });
after(() => vite.close());
const { nextStudentLesson, recentAttempts, quizAvailability, filterResults, resultPage } = await vite.ssrLoadModule("/features/workspace/study-flow.ts");
const { localReport, reportCsv } = await vite.ssrLoadModule("/features/dashboard/report-model.ts");
const { reportDate, reportTime, calendarDay } = await vite.ssrLoadModule("/lib/report-time.ts");
const { seedWorkspace } = await vite.ssrLoadModule("/features/workspace/model.ts");
const { seedCourses } = await vite.ssrLoadModule("/features/courses/model.ts");
const { resultsCsv } = await vite.ssrLoadModule("/features/workspace/account-utils.ts");

const course = { ...seedCourses[0], sequential: true };
const student = { ...seedWorkspace.students[0], status: "active", courseIds: [course.id] };
const quiz = { ...seedWorkspace.quizzes[0], courseId: course.id, published: true, maxAttempts: 3 };
const lesson = (id, order, patch = {}) => ({ ...seedWorkspace.lessons[0], id, order, courseId: course.id, published: true, ...patch });
const attempt = (id, createdAt, patch = {}) => ({ id, createdAt, studentId: student.id, studentName: student.name, quizId: quiz.id, courseId: course.id, title: quiz.title, passScore: 70, score: 80, questions: quiz.questions, answers: quiz.questions.map(q => q.correct), ...patch });
const data = (attempts = [], patch = {}) => ({ students: [student], lessons: [lesson("first", 1)], completed: {}, attempts, ...patch });
const all = { course: "all", quiz: "all", status: "all", since: "" };

test("continue learning follows the server's position/module/id order, not query arrival order", () => {
  const lessons = [lesson("later", 2, { module: "A" }), lesson("first", 1, { module: "Z" })];
  assert.equal(nextStudentLesson([course], lessons, [], student).id, "first");
  assert.equal(nextStudentLesson([course], lessons, ["first"], student).id, "later");
  assert.deepEqual(lessons.map(l => l.id), ["later", "first"]);
});

test("unpublished lessons do not lock the next published lesson", () => {
  const lessons = [lesson("hidden", 1, { published: false }), lesson("visible", 2)];
  assert.equal(nextStudentLesson([course], lessons, [], student).id, "visible");
});

test("continue learning excludes archived, unassigned courses and inactive profiles", () => {
  const lessons = [lesson("first", 1)];
  assert.equal(nextStudentLesson([{ ...course, status: "archived" }], lessons, [], student), undefined);
  for (const s of [undefined, { ...student, courseIds: [] }, { ...student, status: "paused" }, { ...student, invitation: true }]) {
    assert.equal(nextStudentLesson([course], lessons, [], s), undefined);
  }
});

test("fully completed course gives way to the next assigned course", () => {
  const other = { ...course, id: "course-two" };
  const lessons = [lesson("first", 1), lesson("second-course", 1, { courseId: other.id })];
  assert.equal(nextStudentLesson([course, other], lessons, ["first"], { ...student, courseIds: [course.id, other.id] }).id, "second-course");
  assert.equal(nextStudentLesson([course], lessons, ["first"], student), undefined);
});

test("latest attempts use actual time, not UUID or raw timezone text", () => {
  const old = attempt("z-old", "2026-10-07T10:00:00+05:00");
  const recent = attempt("a-new", "2026-10-07T06:00:00Z");
  const rows = [old, recent];
  assert.deepEqual(recentAttempts(rows).map(a => a.id), ["a-new", "z-old"]);
  assert.deepEqual(rows.map(a => a.id), ["z-old", "a-new"]);
});

test("attempt order retains sub-millisecond precision and deterministic equal-time order", () => {
  const rows = [attempt("z", "2026-10-07T06:00:00.123001Z"), attempt("a", "2026-10-07T11:00:00.123002+05:00")];
  assert.equal(recentAttempts(rows)[0].id, "a");
  assert.deepEqual(recentAttempts([attempt("a", "2026-10-07T00:00:00Z"), attempt("b", "2026-10-07T00:00:00Z")]).map(a => a.id), ["b", "a"]);
});

test("quiz availability counts only the current student's attempts for this quiz", () => {
  const rows = [attempt("own", "2026-10-07T01:00:00Z"), attempt("other-student", "2026-10-07T02:00:00Z", { studentId: "other" }), attempt("other-quiz", "2026-10-07T03:00:00Z", { quizId: "other" })];
  const state = quizAvailability(quiz, [course], student, rows);
  assert.equal(state.canStart, true); assert.equal(state.remaining, 2); assert.equal(state.latest.id, "own");
});

test("used attempts block starting while retaining the previous result", () => {
  const rows = [1, 2, 3, 4].map(n => attempt("a" + n, `2026-10-07T0${n}:00:00Z`));
  const state = quizAvailability(quiz, [course], student, rows);
  assert.equal(state.canStart, false); assert.equal(state.remaining, 0); assert.equal(state.latest.id, "a4");
});

test("retake buttons cannot offer archived, unpublished, empty or unassigned quizzes", () => {
  for (const q of [undefined, { ...quiz, published: false }, { ...quiz, questions: [] }]) assert.equal(quizAvailability(q, [course], student, []).canStart, false);
  assert.equal(quizAvailability(quiz, [{ ...course, status: "archived" }], student, []).canStart, false);
  for (const s of [undefined, { ...student, courseIds: [] }, { ...student, status: "paused" }, { ...student, invitation: true }]) assert.equal(quizAvailability(quiz, [course], s, []).canStart, false);
});

test("Tashkent calendar correctly crosses midnight and year boundaries", () => {
  assert.equal(reportDate("2026-10-06T18:59:59Z"), "2026-10-06");
  assert.equal(reportDate("2026-10-06T19:00:00Z"), "2026-10-07");
  assert.equal(reportDate("2026-12-31T19:00:00Z"), "2027-01-01");
  assert.equal(reportTime("2026-10-06T19:00:00Z").hour, 0);
  assert.equal(reportDate("invalid"), "");
  assert.equal(calendarDay("2026-02-30"), null);
});

test("report period, unique students and hourly heatmap share Tashkent boundaries", () => {
  const rows = [attempt("before", "2026-10-06T18:59:59Z"), attempt("start", "2026-10-06T19:00:00Z"), attempt("end", "2026-10-07T18:59:59Z"), attempt("after", "2026-10-07T19:00:00Z")];
  const report = localReport(data(rows), [course], "2026-10-07", 1);
  assert.equal(report.attempts, 2); assert.equal(report.active, 1);
  assert.deepEqual(report.trend, [{ date: "2026-10-07", active: 1, activity: 2 }]);
  assert.equal(report.heatmap[2][0], 1); assert.equal(report.heatmap[2][23], 1);
});

test("reports do not count invitation drafts or paused users as active course members", () => {
  const report = localReport(data([], { students: [student, { ...student, id: "draft", invitation: true }, { ...student, id: "paused", status: "paused" }] }), [course], "2026-10-07", 7);
  assert.equal(report.courses[0].students, 1); assert.equal(report.funnel[0].value, 2);
});

test("report empty states and malformed period cannot crash the page", () => {
  const empty = localReport(data([]), [], "2026-10-07", 7);
  assert.equal(empty.attempts, 0); assert.equal(empty.score, "—"); assert.equal(empty.trend.length, 7);
  const invalid = localReport(data([]), [], "invalid", NaN);
  assert.equal(invalid.trend.length, 30);
});

test("result course, quiz, outcome and date filters combine without changing source rows", () => {
  const rows = [attempt("before", "2026-10-06T18:59:59Z"), attempt("pass", "2026-10-06T19:00:00Z"), attempt("fail", "2026-10-07T01:00:00Z", { score: 30 }), attempt("other", "2026-10-07T01:00:00Z", { courseId: "other" })];
  const result = filterResults(rows, { course: course.id, quiz: quiz.id, status: "passed", since: "2026-10-07" });
  assert.deepEqual(result.map(a => a.id), ["pass"]); assert.equal(rows.length, 4);
});

test("result pagination clamps the last page and filters still include all export rows", () => {
  const rows = Array.from({ length: 23 }, (_, i) => attempt("a" + i, "2026-10-07T00:00:00Z"));
  const filtered = filterResults(rows, all);
  assert.equal(resultPage(filtered, 1).items.length, 10);
  assert.deepEqual([resultPage(filtered, 999).page, resultPage(filtered, 999).first, resultPage(filtered, 999).last], [3, 21, 23]);
  assert.equal(resultPage([], 999).first, 0);
  assert.equal(resultsCsv(filtered, {}).split("\r\n").length, 24);
});

test("report and result CSVs protect formulas, quotes and Uzbek text", () => {
  const csv = reportCsv("Supabase", [{ date: "2026-10-07", active: 1, activity: 2 }], [{ id: "x", name: '=HYPERLINK("bad")', students: 1, progress: 0 }]);
  assert.equal(csv.charCodeAt(0), 0xfeff); assert.match(csv, /Sana \(Toshkent\)/); assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.includes('""bad""'));
  const result = resultsCsv([attempt("a", "2026-10-07T00:00:00Z", { studentName: " +formula", title: "O‘zbekcha" })], {});
  assert.ok(result.includes("' +formula")); assert.ok(result.includes("O‘zbekcha"));
});
