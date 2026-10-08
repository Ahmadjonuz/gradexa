import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, ws: false },
});
after(() => vite.close());
const { createCourseRepository, COURSE_STORAGE_KEY } = await vite.ssrLoadModule(
  "/features/courses/repository.ts",
);
const { filterCourses, seedCourses } = await vite.ssrLoadModule(
  "/features/courses/model.ts",
);
const input = {
  title: " React amaliyoti ",
  description: "Mustaqil React loyihalarini yaratish va boshqarish.",
  category: "Dasturlash",
  level: "beginner",
  status: "draft",
};
function storage(initial) {
  const values = new Map(initial ? [[COURSE_STORAGE_KEY, initial]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
test("create persists normalized data; a fresh repository can read it", () => {
  const port = storage();
  const saved = createCourseRepository(port).save(input);
  assert.equal(saved.ok, true);
  assert.equal(saved.course.title, "React amaliyoti");
  assert.equal(saved.course.students, 0);
  assert.equal(createCourseRepository(port).read().courses.length, 4);
});
test("invalid fields do not write to storage", () => {
  const port = storage();
  assert.equal(
    createCourseRepository(port).save({ ...input, title: "  " }).ok,
    false,
  );
  assert.equal(port.getItem(COURSE_STORAGE_KEY), null);
});
test("editing keeps enrollment and progress; stale edits are rejected", () => {
  const repository = createCourseRepository(storage());
  const previous = repository.read().courses[0];
  const saved = repository.save(
    { ...previous, title: "Yangilangan Frontend" },
    previous,
  );
  assert.equal(saved.ok, true);
  assert.equal(saved.course.students, previous.students);
  assert.equal(saved.course.progress, previous.progress);
  assert.equal(
    repository.save({ ...previous, title: "Eskirgan o‘zgarish" }, previous).ok,
    false,
  );
  assert.equal(repository.read().courses[0].title, "Yangilangan Frontend");
});
test("invalid or future storage format is never silently overwritten", () => {
  for (const raw of ["not json", '{"version":2,"courses":[]}']) {
    const port = storage(raw);
    const repository = createCourseRepository(port);
    assert.ok(repository.read().error);
    assert.equal(repository.save(input).ok, false);
    assert.equal(port.getItem(COURSE_STORAGE_KEY), raw);
  }
});
test("quota and blocked-storage failures return errors instead of success", () => {
  const quota = createCourseRepository({
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  assert.equal(quota.save(input).ok, false);
  const blocked = createCourseRepository({
    getItem: () => {
      throw new Error("blocked");
    },
    setItem() {
      assert.fail("must not write");
    },
  });
  assert.ok(blocked.read().error);
  assert.equal(blocked.save(input).ok, false);
});
test("search and status filter combine without mutating original records", () => {
  const items = [
    ...seedCourses,
    {
      ...seedCourses[0],
      id: "draft-react",
      title: "React amaliyoti",
      status: "draft",
    },
  ];
  const originalOrder = items.map((course) => course.id);
  assert.equal(
    filterCourses(items, " REACT ", "draft", "title")[0].id,
    "draft-react",
  );
  assert.equal(filterCourses(items, "React", "published", "recent").length, 0);
  assert.deepEqual(
    items.map((course) => course.id),
    originalOrder,
  );
});
test("archiving is reversible and does not delete a course", () => {
  const repository = createCourseRepository(storage());
  const previous = repository.read().courses[0];
  const archived = repository.save(
    { ...previous, status: "archived" },
    previous,
  );
  assert.equal(archived.ok, true);
  const restored = repository.save(
    { ...archived.course, status: "published" },
    archived.course,
  );
  assert.equal(restored.ok, true);
  assert.equal(repository.read().courses.length, 3);
});
