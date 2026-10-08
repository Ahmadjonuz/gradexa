import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, ws: false } });
after(() => vite.close());
const { nextLessonOrder, duplicateLessonOrder, studentSearchLessons, studentStatusFilter, adminActions } = await vite.ssrLoadModule("/features/workspace/admin-tools.ts");
const lesson = (id, order = 1, extra = {}) => ({ id, courseId: "course-a", module: "Basics", title: id, body: "Lesson text", order, minutes: 10, published: true, videoUrl: "", ...extra });
const student = { id: "student-a", status: "active", courseIds: ["course-a"] };
const courses = [{ id: "course-a", title: "Course A", status: "published", sequential: true }];

test("new lesson appends inside its course/module without changing records", () => {
  const data = [lesson("one", 1), lesson("two", 4), lesson("other", 99, { module: "Advanced" }), lesson("another-course", 90, { courseId: "course-b" })];
  const before = structuredClone(data);
  assert.equal(nextLessonOrder(data, "course-a", "Basics"), 5);
  assert.equal(nextLessonOrder(data, "course-a", "New module"), 1);
  assert.deepEqual(data, before);
});
test("lesson order handles 999 and exhausted modules without producing invalid positions", () => {
  assert.equal(nextLessonOrder([lesson("last", 999)], "course-a", "Basics"), 1);
  const full = Array.from({ length: 999 }, (_, i) => lesson(String(i), i + 1));
  assert.equal(nextLessonOrder(full, "course-a", "Basics"), null);
});
test("duplicate position matches the SQL course/module tuple and excludes the edited lesson", () => {
  const data = [lesson("one", 1), lesson("two", 2)];
  assert.equal(duplicateLessonOrder(data, lesson("one", 1)), false);
  assert.equal(duplicateLessonOrder(data, lesson("new", 1)), true);
  assert.equal(duplicateLessonOrder(data, lesson("new", 1, { module: " Basics " })), true);
  assert.equal(duplicateLessonOrder(data, lesson("new", 1, { module: "Advanced" })), false);
  assert.equal(duplicateLessonOrder(data, lesson("new", 1, { courseId: "course-b" })), false);
});
test("student search preserves sequential locking and does not leak unpublished lessons", () => {
  const data = { lessons: [lesson("second", 2), lesson("draft", 0, { published: false }), lesson("first", 1)], completed: {} };
  let result = studentSearchLessons(courses, data, student);
  assert.deepEqual(result.map(l => [l.id, l.locked]), [["first", false], ["second", true]]);
  data.completed[student.id] = ["first"];
  result = studentSearchLessons(courses, data, student);
  assert.ok(result.every(l => !l.locked));
  assert.ok(result.every(l => l.courseTitle === "Course A"));
});
test("student search requires active enrollment and a published course", () => {
  const data = { lessons: [lesson("one")], completed: {} };
  for (const actor of [undefined, { ...student, status: "paused" }, { ...student, invitation: true }, { ...student, courseIds: [] }]) assert.deepEqual(studentSearchLessons(courses, data, actor), []);
  assert.deepEqual(studentSearchLessons([{ ...courses[0], status: "archived" }], data, student), []);
});
test("non-sequential courses permit all published lessons", () => {
  const result = studentSearchLessons([{ ...courses[0], sequential: false }], { lessons: [lesson("one"), lesson("two", 2)], completed: {} }, student);
  assert.ok(result.every(l => !l.locked));
});
test("URL status filter accepts only known statuses", () => {
  for (const value of ["active", "invited", "paused"]) assert.equal(studentStatusFilter(value), value);
  for (const value of [undefined, "", "all", "admin", "__proto__", "<script>"]) assert.equal(studentStatusFilter(value), "all");
});
test("admin shortcuts stay in the admin role and include real creation/invitation destinations", () => {
  assert.ok(adminActions.every(action => action.href.startsWith("/admin/")));
  assert.ok(adminActions.some(action => action.href === "/admin/quizzes/new"));
  assert.ok(adminActions.some(action => action.href === "/admin/students?status=invited"));
  assert.equal(new Set(adminActions.map(action => action.href)).size, adminActions.length);
});
