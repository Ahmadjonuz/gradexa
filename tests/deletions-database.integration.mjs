// Isolated SQL only. The Auth deletion below simulates an Admin API cascade;
// this suite never connects to a live project or calls a real Auth service.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const pkg=process.env.GRADEXA_PGLITE_PATH;
if(!pkg)throw Error('Set GRADEXA_PGLITE_PATH to an isolated PGlite installation.');
const {PGlite}=await import(pathToFileURL(pkg+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(pkg+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});after(()=>db.close());
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',invited_at timestamptz,email_confirmed_at timestamptz,encrypted_password text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;`);
const migration=await readFile(new URL('../supabase/migrations/202610070001_admin_deletions.sql',import.meta.url),'utf8');
for(const name of ['202609100001_gradexa_foundation.sql','202609250001_courses_data_layer.sql','202610020001_enrollments_data_layer.sql','202610020002_lessons_data_layer.sql','202610020003_workspace_data_layer.sql','202610060001_student_invitations.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
await db.exec(migration);
async function user(role='student',status='active'){const id=randomUUID();await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3::jsonb)',[id,id+'@example.test',JSON.stringify({full_name:'Deletion Test Student'})]);await db.query('update profiles set role=$2,status=$3 where id=$1',[id,role,status]);return id;}
const owner=await user('owner'),student=await user(),paused=await user('admin','paused');
async function as(role,actor,fn){await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor??'']);try{return await fn();}finally{await db.exec('reset role');}}
const value=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const preview=(kind,id,actor=owner,role='authenticated')=>as(role,actor,()=>value('select gradexa_deletion_preview($1,$2) value',[kind,id]));
const remove=(p,actor=owner,role='authenticated')=>as(role,actor,()=>value('select gradexa_delete_record($1,$2,$3,$4) value',[p.kind,p.id,p.fingerprint,p.name]));
const prepare=(p,actor=owner,role='service_role')=>as(role,null,()=>value('select gradexa_prepare_student_delete($1,$2,$3,$4,$5) value',[actor,p.kind,p.id,p.fingerprint,p.name]));
async function course(status='draft'){const id=randomUUID(),slug='c-'+id;await db.query("insert into courses(id,slug,title,description,category,level,status) values($1,$2,'Deletion course','A sufficiently long test description','Coding','beginner',$3)",[id,slug,status]);return{id,slug};}
async function lesson(c){const id=randomUUID(),external='lesson-'+id;await db.query("insert into lessons(id,external_id,course_id,title,module_title,body,duration_minutes,position,is_published) values($1,$2,$3,'Deletion lesson','Basics','A sufficiently long lesson text',10,1,true)",[id,external,c.id]);return{id,external};}
async function quiz(c){const id=randomUUID(),external='quiz-'+id;await db.query("insert into quizzes(id,external_id,course_id,title,pass_score) values($1,$2,$3,'Deletion quiz',70)",[id,external,c.id]);await db.query("insert into quiz_questions(quiz_id,external_id,prompt,options,correct_index,position) values($1,'question','What is correct?','[\"A\",\"B\",\"C\",\"D\"]',0,1)",[id]);return{id,external};}
async function draft(c,uid=null){const id=randomUUID();await db.query("insert into student_invitation_drafts(id,full_name,email,course_slugs,user_id) values($1,'Invitation Student',$2,$3,$4)",[id,id+'@example.test',[c.slug],uid]);return id;}
test('migration is repeatable, preserves rows and leaves RLS enabled',async()=>{
  await db.exec(migration);assert.equal(await value('select count(*)::int value from profiles'),3);
  assert.equal(await value("select bool_and(relrowsecurity) value from pg_class where oid in ('profiles'::regclass,'lessons'::regclass,'quizzes'::regclass,'courses'::regclass)"),true);
});
test('student, paused admin and anonymous callers cannot inspect or delete',async()=>{
  const c=await course();for(const actor of [student,paused])await assert.rejects(preview('course',c.slug,actor),/administrator/);
  await assert.rejects(preview('course',c.slug,null,'anon'),/permission denied/);
  const p=await preview('course',c.slug);await assert.rejects(remove(p,student),/administrator/);
  await assert.rejects(as('authenticated',owner,()=>db.query('select gradexa_private.deletion_info($1,$2)',['course',c.slug])),/permission denied/);
  await assert.rejects(as('authenticated',owner,()=>db.query('delete from lessons')),/permission denied/);
});
test('lesson deletion removes only its own progress and a stale impact count is rejected',async()=>{
  const c=await course(),l=await lesson(c),p=await preview('lesson',l.external);
  await db.query("insert into lesson_progress(student_id,lesson_id,note,is_completed) values($1,$2,'Private note',true)",[student,l.id]);
  await assert.rejects(remove(p),/o‘zgargan/);
  const current=await preview('lesson',l.external);assert.equal(current.counts.progress,1);assert.equal((await remove(current)).ok,true);
  assert.equal(await value('select count(*)::int value from lesson_progress where lesson_id=$1',[l.id]),0);
  assert.equal(await value('select count(*)::int value from courses where id=$1',[c.id]),1);
});
test('renamed records and incorrect typed confirmation cannot be deleted',async()=>{
  const c=await course(),p=await preview('course',c.slug);
  await assert.rejects(remove({...p,name:'Wrong name'}),/tasdiqlang/);
  await db.query("update courses set title='Renamed course' where id=$1",[c.id]);await assert.rejects(remove(p),/o‘zgargan/);
});
test('empty quiz deletes its questions; a quiz with results remains protected',async()=>{
  const c=await course(),q=await quiz(c);const p=await preview('quiz',q.external);assert.equal(p.counts.questions,1);await remove(p);
  assert.equal(await value('select count(*)::int value from quiz_questions where quiz_id=$1',[q.id]),0);
  const q2=await quiz(c);await db.query("insert into quiz_attempts(quiz_id,student_id,score,pass_score,answers,question_snapshot) values($1,$2,100,70,'[0]','[]')",[q2.id,student]);
  const blocked=await preview('quiz',q2.external);assert.equal(blocked.counts.results,1);await assert.rejects(remove(blocked),/natijalari/);
});
test('course deletion protects lessons, enrollments and invitation array references',async()=>{
  for(const dependency of ['lesson','enrollment','invitation']){const c=await course();if(dependency==='lesson')await lesson(c);else if(dependency==='enrollment')await db.query('insert into enrollments(student_id,course_id) values($1,$2)',[student,c.id]);else await draft(c);const p=await preview('course',c.slug);assert.ok(p.blocked);await assert.rejects(remove(p),/bog‘langan/);}
  const c=await course('published');await assert.rejects(remove(await preview('course',c.slug)),/Avval kursni/);
  const empty=await course();await remove(await preview('course',empty.slug));assert.equal(await value('select count(*)::int value from courses where id=$1',[empty.id]),0);
});
test('new invitation cannot reference a deleted/nonexistent course',async()=>{
  const c=await course();await remove(await preview('course',c.slug));await assert.rejects(draft(c),/Taklif kursi topilmadi/);
});
test('draft invitations can be removed but dispatching/unreconciled ones are blocked',async()=>{
  const c=await course(),id=await draft(c);await remove(await preview('invitation',id));
  const sending=await draft(c);await db.query("update student_invitation_drafts set delivery_state='sending',provision_token=gen_random_uuid() where id=$1",[sending]);await assert.rejects(remove(await preview('invitation',sending)),/yuborish yakunlanmagan/);
  await db.query("update student_invitation_drafts set delivery_state='failed' where id=$1",[sending]);await assert.rejects(remove(await preview('invitation',sending)),/noma’lum/);
});
test('Auth preparation is service-only and never accepts an admin/owner as a target',async()=>{
  const uid=await user(),p=await preview('student',uid);await assert.rejects(prepare(p,owner,'authenticated'),/permission denied/);await assert.rejects(prepare(p,student),/administrator/);await assert.rejects(preview('student',owner),/Faqat talaba/);
  await assert.rejects(remove(p),/server orqali/);
});
test('prepared deletion pauses the student and blocks reactivation or new submissions',async()=>{
  const uid=await user(),p=await preview('student',uid);const result=await prepare(p);assert.equal(result.userId,uid);
  assert.equal(await value('select status value from profiles where id=$1',[uid]),'paused');
  await assert.rejects(db.query("update profiles set status='active' where id=$1",[uid]),/yakunlanmagan/);
  await assert.rejects(as('authenticated',uid,()=>db.query("select gradexa_workspace_read('students',0)")),/Faol akkaunt/);
  const retry=await preview('student',uid);assert.equal(retry.pending,true);await assert.rejects(prepare(retry),/Besh daqiqadan/);
  await db.query("update profiles set deletion_started_at=now()-interval '6 minutes' where id=$1",[uid]);
  const renewed=await prepare(await preview('student',uid));assert.notEqual(renewed.requestId,result.requestId);assert.equal(renewed.canRestore,false);
  const stale=await as('service_role',null,()=>value('select gradexa_abort_student_delete($1,$2,$3) value',[owner,uid,result.requestId]));assert.equal(stale.restored,false);
});
test('definite Auth rejection can restore exactly the previous status using its request token',async()=>{
  const uid=await user('student','invited'),p=await preview('student',uid),result=await prepare(p);
  const abort=token=>as('service_role',null,()=>value('select gradexa_abort_student_delete($1,$2,$3) value',[owner,uid,token]));
  assert.equal((await abort(randomUUID())).restored,false);assert.equal((await abort(result.requestId)).restored,true);
  assert.equal(await value('select status value from profiles where id=$1',[uid]),'invited');
});
test('Auth delete cascade removes only target student data including accepted invitation history',async()=>{
  const uid=await user(),other=await user(),c=await course(),l=await lesson(c),q=await quiz(c);
  for(const id of [uid,other]){await db.query('insert into enrollments(student_id,course_id) values($1,$2)',[id,c.id]);await db.query("insert into lesson_progress(student_id,lesson_id,note) values($1,$2,'Keep unrelated notes')",[id,l.id]);await db.query("insert into quiz_attempts(quiz_id,student_id,score,pass_score,answers,question_snapshot) values($1,$2,50,70,'[0]','[]')",[q.id,id]);}
  const d=await draft(c,uid);await db.query('update student_invitation_drafts set accepted_at=now() where id=$1',[d]);
  const p=await preview('student',uid);assert.deepEqual(p.counts,{enrollments:1,results:1,progress:1,invitations:1});await prepare(p);
  await db.query('delete from auth.users where id=$1',[uid]); // Simulated committed Auth Admin API.
  for(const table of ['enrollments','lesson_progress','quiz_attempts']){assert.equal(await value(`select count(*)::int value from ${table} where student_id=$1`,[uid]),0);assert.equal(await value(`select count(*)::int value from ${table} where student_id=$1`,[other]),1);}
  assert.equal(await value('select count(*)::int value from student_invitation_drafts where id=$1',[d]),0);assert.equal(await value('select count(*)::int value from quizzes where id=$1',[q.id]),1);
});
test('sent invitation deletion resolves the linked Auth student rather than treating it as a draft',async()=>{
  const uid=await user('student','invited'),c=await course(),d=await draft(c,uid);await db.query("update student_invitation_drafts set delivery_state='sent',provision_token=gen_random_uuid() where id=$1",[d]);const p=await preview('invitation',d);assert.equal(p.authAccount,true);assert.equal((await prepare(p)).userId,uid);
});
test('quick task deletion persists and concurrent edit invalidates the preview',async()=>{
  const id=randomUUID();await db.query("insert into quick_tasks(id,title) values($1,'Remove this task')",[id]);const p=await preview('task',id);await db.query("update quick_tasks set title='Changed task' where id=$1",[id]);await assert.rejects(remove(p),/o‘zgargan/);await remove(await preview('task',id));assert.equal(await value('select count(*)::int value from quick_tasks where id=$1',[id]),0);
});
