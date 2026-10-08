// Optional isolated PostgreSQL suite. Never connects to a production Supabase project.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const pkg=process.env.GRADEXA_PGLITE_PATH;
if(!pkg) throw Error('Set GRADEXA_PGLITE_PATH to an isolated @electric-sql/pglite install.');
const {PGlite}=await import(pathToFileURL(pkg+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(pkg+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}}); after(()=>db.close());
await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',invited_at timestamptz,email_confirmed_at timestamptz,encrypted_password text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated;`);
for(const file of ['202609100001_gradexa_foundation.sql','202609250001_courses_data_layer.sql','202610020001_enrollments_data_layer.sql','202610020002_lessons_data_layer.sql','202610020003_workspace_data_layer.sql','202610060001_student_invitations.sql','202610070001_admin_deletions.sql']) await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const owner=randomUUID(),student=randomUUID(),paused=randomUUID();
for(const [id,name] of [[owner,'Owner'],[student,'Student'],[paused,'Paused']]) await db.query('insert into auth.users(id,email) values($1,$2)',[id,name.toLowerCase()+'@example.test']);
await db.query("update profiles set role='owner' where id=$1",[owner]);
await db.query("update profiles set role='admin',status='paused' where id=$1",[paused]);
const course=randomUUID();
await db.query("insert into courses(id,slug,title,description,category,level,status) values($1,'course-a','Invitation course','A course used to verify invitations','Coding','beginner','published')",[course]);
async function asRole(role,actor,fn){await db.exec(`set role ${role}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor??'']);try{return await fn();}finally{await db.exec('reset role');}}
const data=(email=randomUUID()+'@example.test')=>({id:randomUUID(),name:'New Student',email,bio:'',status:'invited',courseIds:['course-a']});
async function prepare(d,actor=owner,role='service_role'){return asRole(role,actor,async()=>(await db.query('select gradexa_prepare_invitation($1,$2::jsonb) value',[actor,JSON.stringify(d)])).rows[0].value);}
async function finish(d,uid,sent=true,claim=d.claim){return asRole('service_role',null,()=>db.query('select gradexa_finish_invitation($1,$2,$3,$4)',[d.id,claim,uid,sent]));}
async function account(d,{confirmed=false,password=false}={}){const uid=randomUUID();await db.query('insert into auth.users(id,email,raw_user_meta_data,invited_at,email_confirmed_at,encrypted_password) values($1,$2,$3::jsonb,now(),$4,$5)',[uid,d.email,JSON.stringify({full_name:d.name,gradexa_invitation_id:d.id,gradexa_invitation_token:d.token}),confirmed?new Date().toISOString():null,password?'test-hash':null]);return uid;}
async function accept(uid){return asRole('authenticated',uid,()=>db.query('select gradexa_accept_invitation()'));}
async function students(uid=owner){return asRole('authenticated',uid,async()=>(await db.query("select gradexa_workspace_read('students',0) value")).rows[0].value);}
const profile=async uid=>(await db.query('select * from profiles where id=$1',[uid])).rows[0];
async function age(d){await db.query("update student_invitation_drafts set attempted_at=now()-interval '6 minutes' where id=$1",[d.id]);}

test('invitation RPC is service-only and independently checks active staff',async()=>{
  for(const role of ['anon','authenticated']) await assert.rejects(prepare(data(),owner,role),/permission denied/);
  for(const actor of [student,paused,randomUUID()]) await assert.rejects(prepare(data(),actor),/administrator/);
  await assert.rejects(asRole('authenticated',student,()=>db.query('select gradexa_private.bind_invitation($1,$2,true)',[randomUUID(),student])),/permission denied/);
});
test('send -> pending profile -> password -> active student with assigned course and one visible row',async()=>{
  const d=await prepare(data());const uid=await account(d);await finish(d,uid);
  assert.equal((await profile(uid)).status,'invited'); assert.equal((await profile(uid)).role,'student');
  let rows=(await students()).filter(s=>s.email===d.email);assert.equal(rows.length,1);assert.equal(rows[0].invitationState,'sent');
  assert.ok(!JSON.stringify(rows).includes(d.token));
  await assert.rejects(students(uid),/Faol akkaunt/);await assert.rejects(accept(uid),/Emailni tasdiqlang/);
  await db.query('update auth.users set email_confirmed_at=now(),encrypted_password=$2 where id=$1',[uid,'test-password-hash']);
  await accept(uid); await accept(uid);
  assert.equal((await profile(uid)).status,'active');rows=(await students()).filter(s=>s.email===d.email);assert.equal(rows.length,1);assert.equal(rows[0].id,uid);assert.equal(rows[0].invitation,false);
  assert.deepEqual((await students(uid))[0].courseIds,['course-a']);
  assert.equal((await db.query('select count(*)::int n from enrollments where student_id=$1',[uid])).rows[0].n,1);
});
test('pending claim, old completion and existing accounts cannot create duplicate invitations',async()=>{
  const input=data();const d=await prepare(input);await assert.rejects(prepare(input),/yuborilmoqda/);
  await assert.rejects(finish(d,null,true),/hisobi topilmadi/);
  await assert.rejects(finish(d,null,false,randomUUID()),/eskirgan/);
  await assert.rejects(prepare(data('student@example.test')),/hisob mavjud/);
  await assert.rejects(prepare({...data(),courseIds:['missing']}),/Kurs topilmadi/);
});
test('email failure, retry and timeout-after-Auth-create retain recoverable state',async()=>{
  const input=data();const d=await prepare(input);await finish(d,null,false);
  assert.equal((await students()).find(s=>s.id===d.id).invitationState,'failed');
  await age(d);const again=await prepare(input);assert.equal(again.token,d.token);assert.notEqual(again.claim,d.claim);
  const uid=await account(again);await finish(again,null,false);
  assert.equal((await profile(uid)).status,'invited');assert.equal((await students()).find(s=>s.id===d.id).invitationUserId,uid);
  await age(d);const retry=await prepare(input);await finish(retry,uid,true);
  assert.equal((await db.query('select count(*)::int n from enrollments where student_id=$1',[uid])).rows[0].n,1);
});
test('acceptance can finish an interrupted dispatch before its server response is saved',async()=>{
  const d=await prepare(data());const uid=await account(d,{confirmed:true,password:true});
  await accept(uid);await finish(d,uid);
  assert.equal((await profile(uid)).status,'active');assert.equal((await students()).filter(s=>s.email===d.email).length,1);
});
test('forged metadata and paused profiles never gain courses, role or activation',async()=>{
  const d=await prepare(data());
  await db.query('update auth.users set raw_user_meta_data=$2::jsonb,invited_at=now(),email_confirmed_at=now(),encrypted_password=$3 where id=$1',[student,JSON.stringify({gradexa_invitation_id:d.id,gradexa_invitation_token:d.token}),'test-hash']);
  await assert.rejects(accept(student),/mos kelmadi/);
  const uid=await account(d,{confirmed:true,password:true});await finish(d,uid);await db.query("update profiles set status='paused' where id=$1",[uid]);await assert.rejects(accept(uid),/faol emas/);assert.equal((await profile(uid)).status,'paused');
  await assert.rejects(asRole('authenticated',student,()=>db.query("update student_invitation_drafts set delivery_state='sent'")),/permission denied/);
  assert.equal((await asRole('authenticated',student,()=>db.query('select * from student_invitation_drafts'))).rows.length,0);
});
test('stale draft writes cannot change a dispatched recipient; accepted retries preserve paused enrollments',async()=>{
  const input=data();const d=await prepare(input);
  await assert.rejects(db.query('update student_invitation_drafts set email=$2 where id=$1',[d.id,'changed@example.test']),/o‘zgartirib bo‘lmaydi/);
  const uid=await account(d,{confirmed:true,password:true});await finish(d,uid);await accept(uid);
  await db.query("update enrollments set status='paused' where student_id=$1",[uid]);await accept(uid);await finish(d,uid);
  assert.equal((await db.query('select status from enrollments where student_id=$1',[uid])).rows[0].status,'paused');
});
test('migration can run twice without losing accounts, drafts or enrollments',async()=>{
  const before=await db.query('select (select count(*) from profiles) p,(select count(*) from enrollments) e,(select count(*) from student_invitation_drafts) d');
  await db.exec(await readFile(new URL('../supabase/migrations/202610060001_student_invitations.sql',import.meta.url),'utf8'));
  assert.deepEqual((await db.query('select (select count(*) from profiles) p,(select count(*) from enrollments) e,(select count(*) from student_invitation_drafts) d')).rows,before.rows);
});
