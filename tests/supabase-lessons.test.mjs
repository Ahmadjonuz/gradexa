import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({
  appType: 'custom',
  configFile: false,
  root,
  resolve: { alias: { '@': root } },
  server: { middlewareMode: true, ws: false },
});
after(() => vite.close());

const {
  createSupabaseLessonRepository,
  mapLessonRow,
} = await vite.ssrLoadModule('/features/lessons/supabase-repository.ts');
const { makeLessonBackup } = await vite.ssrLoadModule('/features/lessons/legacy-import.ts');
const { WORKSPACE_KEY } = await vite.ssrLoadModule('/features/workspace/repository.ts');
const { seedWorkspace } = await vite.ssrLoadModule('/features/workspace/model.ts');

const actor = {
  id: 'c3690c8c-7709-49e2-987d-3f8777f7a7da',
  role: 'owner',
  status: 'active',
};
const courseUuid = 'c44f9f49-924b-4f5b-91d5-d698ba41d65b';
const row = {
  id: '3bc85b24-e219-44d1-91dc-79cf070b9bbd',
  external_id: 'lesson-1',
  course_id: courseUuid,
  module_title: 'Asosiy bilimlar',
  title: 'HTML semantikasi',
  body: 'HTML sahifaning tuzilishini aniq va tushunarli ifodalaydi.',
  video_url: '',
  duration_minutes: 12,
  position: 1,
  is_published: true,
  created_at: '2026-09-01T01:02:03.123456+00:00',
  updated_at: '2026-10-02T04:05:06.654321+00:00',
  courses: { slug: 'frontend', status: 'published' },
};

function client(handler) {
  const calls = [];
  const supabase = createClient('https://gradexa-test.invalid', 'test-publishable', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (url, options) => {
        const request = {
          url: new URL(url),
          method: options.method,
          headers: new Headers(options.headers),
          body: options.body ? JSON.parse(options.body) : undefined,
        };
        calls.push(request);
        const result = handler(request, calls.length - 1);
        return new Response(JSON.stringify(result.body), {
          status: result.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  });
  return { supabase, calls };
}

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('lesson rows keep external IDs and map course UUIDs back to slugs', () => {
  const lesson = mapLessonRow(row);
  assert.equal(lesson.id, 'lesson-1');
  assert.equal(lesson.courseId, 'frontend');
  assert.equal(lesson.module, row.module_title);
  assert.equal(lesson.updatedAt, row.updated_at);
});

test('empty Supabase returns no lesson fixtures', async () => {
  const { supabase } = client(() => ({ body: [] }));
  assert.deepEqual(
    await createSupabaseLessonRepository(supabase, actor).read(),
    { ok: true, lessons: [] },
  );
});

test('student reads only published lessons in published enrolled courses', async () => {
  const { supabase, calls } = client(() => ({ body: [row] }));
  const result = await createSupabaseLessonRepository(
    supabase,
    { ...actor, role: 'student' },
  ).read();
  assert.equal(result.ok, true);
  assert.equal(result.lessons[0].id, 'lesson-1');
  assert.equal(calls[0].url.searchParams.get('is_published'), 'eq.true');
  assert.equal(calls[0].url.searchParams.get('courses.status'), 'eq.published');
});

test('students, paused staff and missing sessions cannot write lessons', async () => {
  for (const profile of [
    null,
    { ...actor, role: 'student' },
    { ...actor, status: 'paused' },
  ]) {
    const { supabase, calls } = client(() => {
      throw new Error('must not contact DB');
    });
    const result = await createSupabaseLessonRepository(supabase, profile).save(
      mapLessonRow(row),
    );
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  }
});

test('creating resolves a course slug and inserts only lesson fields', async () => {
  const { supabase, calls } = client((request, index) => {
    if (index === 0)
      return { body: { id: courseUuid, slug: 'frontend', status: 'published' } };
    return { body: { ...row, ...request.body } };
  });
  const lesson = mapLessonRow(row);
  const result = await createSupabaseLessonRepository(supabase, actor).save(lesson);
  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.searchParams.get('slug'), 'eq.frontend');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].body.external_id, lesson.id);
  assert.equal(calls[1].body.course_id, courseUuid);
  assert.equal(calls[1].body.module_title, lesson.module);
  for (const key of ['id', 'courseId', 'createdAt', 'updatedAt'])
    assert.equal(key in calls[1].body, false);
});

test('editing uses external ID and exact timestamp concurrency guards', async () => {
  const lesson = mapLessonRow(row);
  const { supabase, calls } = client((_request, index) => {
    if (index === 0)
      return { body: { id: courseUuid, slug: 'frontend', status: 'published' } };
    return { body: null };
  });
  const result = await createSupabaseLessonRepository(supabase, actor).save(
    lesson,
    { id: lesson.id, updatedAt: lesson.updatedAt },
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /boshqa oynada/);
  assert.equal(calls[1].url.searchParams.get('external_id'), 'eq.lesson-1');
  assert.equal(calls[1].url.searchParams.get('updated_at'), `eq.${row.updated_at}`);
  assert.equal('external_id' in calls[1].body, false);
});

test('legacy import preserves IDs and never overwrites a server lesson', async () => {
  const { supabase, calls } = client((_request, index) => {
    if (index === 0)
      return { body: { id: courseUuid, slug: 'frontend', status: 'published' } };
    return { body: [] };
  });
  const result = await createSupabaseLessonRepository(supabase, actor).importLesson(
    seedWorkspace.lessons[0],
  );
  assert.deepEqual(result, { ok: true, inserted: false });
  assert.equal(calls[1].body.external_id, seedWorkspace.lessons[0].id);
  assert.match(calls[1].headers.get('prefer'), /resolution=ignore-duplicates/);
  assert.equal(calls[1].url.searchParams.get('on_conflict'), 'external_id');
});

test('invalid input and database failures are actionable', async () => {
  const invalid = client(() => {
    throw new Error('must not contact DB');
  });
  const repo = createSupabaseLessonRepository(invalid.supabase, actor);
  assert.equal(
    (await repo.save({ ...mapLessonRow(row), title: '' })).ok,
    false,
  );
  assert.equal(invalid.calls.length, 0);

  const missing = client(() => ({
    status: 400,
    body: { code: '42703', message: 'missing external_id' },
  }));
  assert.match(
    (await createSupabaseLessonRepository(missing.supabase, actor).read()).message,
    /202610020002/,
  );
});

test('lesson backup contains only Gradexa workspace data', () => {
  const port = storage();
  port.setItem(WORKSPACE_KEY, JSON.stringify(seedWorkspace));
  port.setItem('sb-example-auth-token', 'DO-NOT-EXPORT');
  const backup = makeLessonBackup(port);
  const parsed = JSON.parse(backup);
  assert.equal(backup.includes('DO-NOT-EXPORT'), false);
  assert.deepEqual(Object.keys(parsed.entries), [WORKSPACE_KEY]);
  assert.equal(parsed.displayedLessons.length, seedWorkspace.lessons.length);
});

test('lesson SQL keeps student reads scoped and staff writes RLS-protected', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/202610020002_lessons_data_layer.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /external_id\s+text/);
  assert.match(sql, /enrollments\.student_id\s*=\s*auth\.uid\(\)/);
  assert.match(sql, /courses\.status\s*=\s*'published'/);
  assert.match(sql, /lessons_insert_staff/);
  assert.match(sql, /lessons_update_staff/);
  assert.match(sql, /grant insert\s*\(/i);
  assert.match(sql, /grant update\s*\(/i);
  assert.doesNotMatch(sql, /grant\s+delete/i);
});
