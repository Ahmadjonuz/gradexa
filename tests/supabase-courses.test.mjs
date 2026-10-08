import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({ appType: 'custom', configFile: false, root, resolve: { alias: { '@': root } }, server: { middlewareMode: true, ws: false } });
after(() => vite.close());
const { createSupabaseCourseRepository, mapCourseRow } = await vite.ssrLoadModule('/features/courses/supabase-repository.ts');
const { makeCourseBackup } = await vite.ssrLoadModule('/features/courses/legacy-import.ts');
const { withLearningStats } = await vite.ssrLoadModule('/features/courses/learning-stats.ts');
const { seedCourses } = await vite.ssrLoadModule('/features/courses/model.ts');
const { workspaceRepository, WORKSPACE_KEY } = await vite.ssrLoadModule('/features/workspace/repository.ts');
const { seedWorkspace } = await vite.ssrLoadModule('/features/workspace/model.ts');
const { createCourseRepository, COURSE_STORAGE_KEY } = await vite.ssrLoadModule('/features/courses/repository.ts');
const actor = { id: 'c3690c8c-7709-49e2-987d-3f8777f7a7da', role: 'owner', status: 'active' };
const row = { id: 'c44f9f49-924b-4f5b-91d5-d698ba41d65b', slug: 'frontend', title: 'Frontend asoslari', description: 'HTML va CSS yordamida sayt yaratishni o‘rganamiz.', category: 'Dasturlash', level: 'beginner', status: 'published', language: 'uz', sequential: true, cover_image: '/images/gradexa/course-frontend.png', created_at: '2026-09-01T01:02:03.123456+00:00', updated_at: '2026-09-25T04:05:06.654321+00:00' };
function client(handler) {
  const calls = [];
  const supabase = createClient('https://gradexa-test.invalid', 'test-publishable', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: async (url, options) => {
      const request = { url: new URL(url), method: options.method, headers: new Headers(options.headers), body: options.body ? JSON.parse(options.body) : undefined };
      calls.push(request);
      const result = handler(request);
      return new Response(JSON.stringify(result.body), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { supabase, calls };
}
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('SQL UUID stays internal; slug and microsecond timestamps round-trip unchanged', () => {
  const result = mapCourseRow(row);
  assert.equal(result.id, 'frontend');
  assert.equal(result.updatedAt, row.updated_at);
  assert.equal(result.createdAt, row.created_at);
  assert.equal(result.coverImage, row.cover_image);
  assert.equal(result.sequential, true);
});
test('empty Supabase returns an empty course catalog without seed fallback', async () => {
  const { supabase } = client(() => ({ body: [] }));
  assert.deepEqual(await createSupabaseCourseRepository(supabase, actor).read(), { ok: true, courses: [] });
});
test('course SELECT paginates and student requests only published courses', async () => {
  const { supabase, calls } = client(request => ({ body: Number(request.url.searchParams.get('offset')) === 0 ? Array.from({ length: 100 }, (_, i) => ({ ...row, slug: `course-${i}` })) : [{ ...row, slug: 'course-100' }] }));
  const result = await createSupabaseCourseRepository(supabase, { ...actor, role: 'student' }).read();
  assert.equal(result.ok, true);
  assert.equal(result.courses.length, 101);
  assert.equal(calls.length, 2);
  for (const call of calls) assert.equal(call.url.searchParams.get('status'), 'eq.published');
});
test('student, paused staff, unknown roles and missing sessions cannot write', async () => {
  for (const profile of [null, { ...actor, role: 'student' }, { ...actor, status: 'paused' }, { ...actor, role: 'outsider' }]) {
    const { supabase, calls } = client(() => { throw new Error('must not contact DB'); });
    const repo = createSupabaseCourseRepository(supabase, profile);
    assert.equal((await repo.save(seedCourses[0])).ok, false);
    assert.equal((await repo.importCourse(seedCourses[0])).ok, false);
    assert.equal(calls.length, 0);
  }
});
test('create persists course metadata only and generates a stable external identifier', async () => {
  const { supabase, calls } = client(request => ({ body: { ...row, ...request.body } }));
  const input = { ...seedCourses[0], language: 'en', sequential: true, coverImage: 'data:image/webp;base64,YQ==', role: 'owner', students: 999 };
  const result = await createSupabaseCourseRepository(supabase, actor).save(input);
  assert.equal(result.ok, true);
  assert.match(result.course.id, /^[0-9a-f-]{36}$/);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.language, 'en');
  assert.equal(calls[0].body.cover_image, input.coverImage);
  assert.equal(calls[0].body.instructor_id, actor.id);
  for (const key of ['id', 'students', 'progress', 'role', 'updated_at']) assert.equal(key in calls[0].body, false);
});
test('editing uses an exact timestamp condition; a stale edit is not reported as saved', async () => {
  const previous = mapCourseRow(row);
  const { supabase, calls } = client(() => ({ body: null }));
  const result = await createSupabaseCourseRepository(supabase, actor).save(previous, previous);
  assert.equal(result.ok, false);
  assert.match(result.message, /boshqa oynada/);
  assert.equal(calls[0].url.searchParams.get('updated_at'), `eq.${row.updated_at}`);
  assert.equal(calls[0].url.searchParams.get('slug'), 'eq.frontend');
  assert.equal('slug' in calls[0].body, false);
  assert.equal('id' in calls[0].body, false);
});
test('migration preserves legacy IDs, skips conflicts and does not overwrite server rows', async () => {
  const { supabase, calls } = client(() => ({ body: [] }));
  const result = await createSupabaseCourseRepository(supabase, actor).importCourse(seedCourses[0]);
  assert.deepEqual(result, { ok: true, inserted: false });
  assert.equal(calls[0].body.slug, seedCourses[0].id);
  assert.equal(calls[0].body.created_at, seedCourses[0].createdAt);
  assert.match(calls[0].headers.get('prefer'), /resolution=ignore-duplicates/);
  assert.equal(calls[0].url.searchParams.get('on_conflict'), 'slug');
});
test('invalid input sends no request; missing schema and denied writes return actionable failures', async () => {
  const { supabase, calls } = client(() => ({ status: 403, body: { code: '42501', message: 'denied' } }));
  const repo = createSupabaseCourseRepository(supabase, actor);
  assert.equal((await repo.save({ ...seedCourses[0], title: '' })).ok, false);
  assert.equal(calls.length, 0);
  assert.match((await repo.save(seedCourses[0])).message, /ruxsat/);
  const missing = client(() => ({ status: 400, body: { code: '42703', message: 'missing column' } }));
  assert.match((await createSupabaseCourseRepository(missing.supabase, actor).read()).message, /202609250001/);
});
test('backup includes only Gradexa data, excludes auth tokens and never changes original storage', () => {
  const port = storage();
  const coursesRaw = JSON.stringify({ version: 1, courses: seedCourses });
  port.setItem(COURSE_STORAGE_KEY, coursesRaw);
  port.setItem(WORKSPACE_KEY, JSON.stringify(seedWorkspace));
  port.setItem('sb-example-auth-token', 'DO-NOT-EXPORT');
  const backup = makeCourseBackup(port);
  assert.equal(backup.includes('DO-NOT-EXPORT'), false);
  assert.deepEqual(Object.keys(JSON.parse(backup).entries).sort(), [COURSE_STORAGE_KEY, WORKSPACE_KEY].sort());
  assert.equal(port.getItem(COURSE_STORAGE_KEY), coursesRaw);
});
test('quiz submission trusts current server course status instead of stale local course storage', () => {
  const port = storage();
  const repo = workspaceRepository(port);
  const quiz = repo.read().data.quizzes[0];
  const args = [quiz.id, 'aziza', quiz.questions.map(q => q.correct), JSON.stringify(quiz)];
  const current = { courses: [{ ...seedCourses[0], status: 'archived' }], ready: true, error: null };
  assert.equal(repo.submit(...args, current).ok, false);
  const local = createCourseRepository(port);
  const previous = local.read().courses[0];
  local.save({ ...previous, status: 'archived' }, previous);
  current.courses[0].status = 'published';
  assert.equal(repo.submit(...args, current).ok, true);
  assert.equal(repo.read().data.attempts.length, 1);
  assert.equal(repo.submit(...args, { courses: [], ready: true, error: 'offline' }).ok, false);
  assert.equal(repo.read().data.attempts.length, 1);
});
test('course counters are derived from current local enrollments and lesson progress', () => {
  const data = structuredClone(seedWorkspace);
  data.completed.aziza = ['lesson-1', 'lesson-2', 'lesson-3'];
  const frontend = withLearningStats(seedCourses, data).find(course => course.id === 'frontend');
  assert.equal(frontend.students, 1);
  assert.equal(frontend.progress, 100);
  assert.notEqual(frontend.students, seedCourses[0].students);
});
