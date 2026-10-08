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
  createSupabaseEnrollmentRepository,
} = await vite.ssrLoadModule('/features/enrollments/supabase-repository.ts');

const actor = {
  id: 'c3690c8c-7709-49e2-987d-3f8777f7a7da',
  role: 'student',
  status: 'active',
};
const courseUuid = 'c44f9f49-924b-4f5b-91d5-d698ba41d65b';

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

test('student reads only own active enrollments and maps course slugs', async () => {
  const { supabase, calls } = client(() => ({
    body: [
      { course_id: courseUuid, status: 'active', courses: { slug: 'frontend', status: 'published' } },
      { course_id: 'other', status: 'active', courses: [{ slug: 'javascript', status: 'published' }] },
    ],
  }));
  const result = await createSupabaseEnrollmentRepository(supabase, actor).readOwn();
  assert.deepEqual(result, { ok: true, courseIds: ['frontend', 'javascript'] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.searchParams.get('student_id'), `eq.${actor.id}`);
  assert.equal(calls[0].url.searchParams.get('status'), 'eq.active');
  assert.equal(calls[0].url.searchParams.get('courses.status'), 'eq.published');
});

test('staff has no artificial current-student enrollments and makes no request', async () => {
  const { supabase, calls } = client(() => { throw new Error('must not contact DB'); });
  const result = await createSupabaseEnrollmentRepository(
    supabase,
    { ...actor, role: 'owner' },
  ).readOwn();
  assert.deepEqual(result, { ok: true, courseIds: [] });
  assert.equal(calls.length, 0);
});

test('missing, paused and non-student actors cannot enroll', async () => {
  for (const profile of [
    null,
    { ...actor, status: 'paused' },
    { ...actor, role: 'owner' },
  ]) {
    const { supabase, calls } = client(() => { throw new Error('must not contact DB'); });
    const result = await createSupabaseEnrollmentRepository(supabase, profile).enroll('frontend');
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  }
});

test('enrollment resolves a published course and inserts only the authenticated student', async () => {
  const { supabase, calls } = client((_request, index) => {
    if (index === 0) return { body: { id: courseUuid, slug: 'frontend' } };
    if (index === 1) return { body: null };
    return { body: null };
  });
  const result = await createSupabaseEnrollmentRepository(supabase, actor).enroll('frontend');
  assert.deepEqual(result, { ok: true, courseId: 'frontend', alreadyEnrolled: false });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url.searchParams.get('slug'), 'eq.frontend');
  assert.equal(calls[0].url.searchParams.get('status'), 'eq.published');
  assert.equal(calls[2].method, 'POST');
  assert.deepEqual(calls[2].body, {
    student_id: actor.id,
    course_id: courseUuid,
    status: 'active',
  });
});

test('an existing active enrollment is idempotent and is not inserted twice', async () => {
  const { supabase, calls } = client((_request, index) =>
    index === 0
      ? { body: { id: courseUuid, slug: 'frontend' } }
      : { body: { status: 'active' } },
  );
  const result = await createSupabaseEnrollmentRepository(supabase, actor).enroll('frontend');
  assert.deepEqual(result, { ok: true, courseId: 'frontend', alreadyEnrolled: true });
  assert.equal(calls.length, 2);
});

test('student cannot reactivate a paused enrollment or send an invalid slug', async () => {
  const paused = client((_request, index) =>
    index === 0
      ? { body: { id: courseUuid, slug: 'frontend' } }
      : { body: { status: 'paused' } },
  );
  const result = await createSupabaseEnrollmentRepository(paused.supabase, actor).enroll('frontend');
  assert.equal(result.ok, false);
  assert.match(result.message, /Administrator/);
  assert.equal(paused.calls.length, 2);

  const invalid = client(() => { throw new Error('must not contact DB'); });
  assert.equal((await createSupabaseEnrollmentRepository(invalid.supabase, actor).enroll('../admin')).ok, false);
  assert.equal(invalid.calls.length, 0);
});

test('missing migration and denied writes return actionable messages', async () => {
  const missing = client(() => ({
    status: 400,
    body: { code: 'PGRST205', message: 'missing table' },
  }));
  assert.match(
    (await createSupabaseEnrollmentRepository(missing.supabase, actor).readOwn()).message,
    /202610020001/,
  );

  const denied = client((_request, index) => {
    if (index === 0) return { body: { id: courseUuid, slug: 'frontend' } };
    if (index === 1) return { body: null };
    return { status: 403, body: { code: '42501', message: 'denied' } };
  });
  assert.match(
    (await createSupabaseEnrollmentRepository(denied.supabase, actor).enroll('frontend')).message,
    /RLS/,
  );
});

test('SQL permits only active students to insert their own published-course enrollment', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/202610020001_enrollments_data_layer.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /student_id\s*=\s*auth\.uid\(\)/);
  assert.match(sql, /profiles\.role\s*=\s*'student'/);
  assert.match(sql, /profiles\.status\s*=\s*'active'/);
  assert.match(sql, /courses\.status\s*=\s*'published'/);
  assert.match(sql, /grant insert \(student_id, course_id, status\)/);
  assert.doesNotMatch(sql, /grant\s+(?:update|delete)/i);
});
