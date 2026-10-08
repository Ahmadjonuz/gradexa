import assert from "node:assert/strict";
import test from "node:test";

async function request(path) {
  const { default: worker } = await import("../dist/server/index.js");
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("public home opens the demo access flow", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /href="\/login"/);
  assert.match(html, /Bilimni/);
});

test("dashboard renders the approved owner, statistics and tasks", async () => {
  const response = await request("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const value of [
    "Good morning, Ahmadjon",
    "248",
    "1,286",
    "76.4%",
    "Frontend Foundations",
    "09:30",
    "11:00",
    "14:45",
    "Namuna ma’lumotlari",
  ]) {
    assert.ok(html.includes(value), `Missing dashboard content: ${value}`);
  }
  assert.doesNotMatch(html, /Starter Project|Saida|codex-preview/);
  assert.match(html, /role="checkbox"/);
  assert.match(html, /id="quick-tasks"/);
  assert.doesNotMatch(html, />Soon</);
});

test("every admin, student and entry route renders without a server error", async () => {
  const paths=["/login","/admin/courses","/admin/courses/new","/admin/courses/frontend","/admin/lessons","/admin/lessons/lesson-1","/admin/quizzes","/admin/quizzes/new","/admin/quizzes/quiz-frontend","/admin/quiz-results","/admin/quiz-results/not-found","/admin/students","/admin/students/aziza","/admin/analytics","/admin/settings","/student","/student/courses","/student/courses/frontend","/student/lessons/lesson-1","/student/quizzes","/student/quizzes/quiz-frontend","/student/results","/student/results/not-found","/student/profile"];
  for(const path of paths){const response=await request(path);assert.equal(response.status,200,`${path} failed`);assert.match(response.headers.get("content-type")??"",/text\/html/);const html=await response.text();assert.doesNotMatch(html,/Internal Server Error|Starter Project/);}
});
