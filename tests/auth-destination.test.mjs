import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, ws: false } });
after(() => vite.close());
const { safeLoginDestination } = await vite.ssrLoadModule("/lib/auth-destination.ts");

test("login continues only inside the authenticated role's area", () => {
  assert.equal(safeLoginDestination("/admin/quizzes/quiz-frontend?tab=questions", "admin"), "/admin/quizzes/quiz-frontend?tab=questions");
  assert.equal(safeLoginDestination("/student/profile", "student"), "/student/profile");
  for (const unsafe of ["https://example.org", "//example.org", "/student/profile", "/administrator", "/admin/%2e%2e/student", "/\\example.org"]) {
    assert.equal(safeLoginDestination(unsafe, "admin"), "/admin");
  }
});
