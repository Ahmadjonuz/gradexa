-- GRADEXA DATA UPDATE 2026-10-02. Existing foundation is required.
-- Run this complete file once in the EXISTING project's Supabase SQL Editor.
begin;
select pg_advisory_xact_lock(hashtextextended('gradexa-data-migration',0));
do $$ begin
  if to_regclass('public.profiles') is null or to_regclass('public.courses') is null or to_regclass('public.quizzes') is null then
    raise exception 'Existing Gradexa foundation is missing. Stop and inspect the correct Supabase project.';
  end if;
end $$;

-- 202609250001_courses_data_layer.sql
-- Gradexa: apply once in Supabase SQL Editor before installing the courses update.
-- Existing tables, records, roles and SELECT policies are preserved.

alter table public.courses
  add column if not exists language text not null default 'uz',
  add column if not exists sequential boolean not null default false,
  add column if not exists cover_image text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.courses'::regclass and conname = 'courses_language_valid') then
    alter table public.courses add constraint courses_language_valid check (language in ('uz', 'en', 'ru'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.courses'::regclass and conname = 'courses_cover_image_valid') then
    -- Preserve the existing UI's built-in assets and resized raster uploads.
    alter table public.courses add constraint courses_cover_image_valid check (
      char_length(cover_image) <= 800000 and (
        cover_image = '' or cover_image ~ '^/images/gradexa/[a-z0-9-]+\.png$'
        or cover_image ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
      )
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'courses_insert_staff') then
    create policy courses_insert_staff on public.courses for insert to authenticated
      with check (public.is_gradexa_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courses' and policyname = 'courses_update_staff') then
    create policy courses_update_staff on public.courses for update to authenticated
      using (public.is_gradexa_staff()) with check (public.is_gradexa_staff());
  end if;
end;
$$;

alter table public.courses enable row level security;
grant select on public.courses to anon, authenticated;
grant insert (slug, title, description, category, level, status, instructor_id, created_at, language, sequential, cover_image)
  on public.courses to authenticated;
grant update (title, description, category, level, status, language, sequential, cover_image)
  on public.courses to authenticated;
-- No DELETE grant. Archiving remains a reversible status change.
notify pgrst, 'reload schema';

-- Result: a row for every course policy; INSERT and UPDATE are staff-only.
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'courses' order by policyname;


-- 202610020001_enrollments_data_layer.sql
-- Gradexa: current students persist their own course enrollment in Supabase.
-- Existing tables, rows and read policies are preserved.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'enrollments'
      and policyname = 'enrollments_insert_self_active_course'
  ) then
    create policy enrollments_insert_self_active_course
    on public.enrollments
    for insert
    to authenticated
    with check (
      student_id = auth.uid()
      and status = 'active'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'student'
          and profiles.status = 'active'
      )
      and exists (
        select 1 from public.courses
        where courses.id = enrollments.course_id
          and courses.status = 'published'
      )
    );
  end if;
end;
$$;

alter table public.enrollments enable row level security;
grant select on public.enrollments to authenticated;
grant insert (student_id, course_id, status) on public.enrollments to authenticated;

notify pgrst, 'reload schema';

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'enrollments'
order by policyname;


-- 202610020002_lessons_data_layer.sql
-- Gradexa: run once in Supabase SQL Editor before installing the lessons update.
-- Existing lesson rows are preserved. DELETE is intentionally not granted.

alter table public.lessons add column if not exists external_id text;

update public.lessons
set external_id = id::text
where external_id is null or external_id = '';

alter table public.lessons alter column external_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lessons'::regclass
      and conname = 'lessons_external_id_valid'
  ) then
    alter table public.lessons
      add constraint lessons_external_id_valid
      check (external_id ~ '^[A-Za-z0-9-]{1,80}$');
  end if;
end;
$$;

create unique index if not exists lessons_external_id_unique
  on public.lessons (external_id);

-- The UI orders lessons inside each module, so position is unique per module.
alter table public.lessons
  drop constraint if exists lessons_course_id_position_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lessons'::regclass
      and conname = 'lessons_course_module_position_unique'
  ) then
    alter table public.lessons
      add constraint lessons_course_module_position_unique
      unique (course_id, module_title, position);
  end if;
end;
$$;

alter table public.lessons enable row level security;

drop policy if exists lessons_read_enrolled_or_staff on public.lessons;
create policy lessons_read_enrolled_or_staff on public.lessons
for select to authenticated
using (
  public.is_gradexa_staff()
  or (
    is_published
    and exists (
      select 1
      from public.courses
      where courses.id = lessons.course_id
        and courses.status = 'published'
    )
    and exists (
      select 1
      from public.enrollments
      where enrollments.student_id = auth.uid()
        and enrollments.course_id = lessons.course_id
        and enrollments.status = 'active'
    )
  )
);

drop policy if exists lessons_insert_staff on public.lessons;
create policy lessons_insert_staff on public.lessons
for insert to authenticated
with check (public.is_gradexa_staff());

drop policy if exists lessons_update_staff on public.lessons;
create policy lessons_update_staff on public.lessons
for update to authenticated
using (public.is_gradexa_staff())
with check (public.is_gradexa_staff());

grant select on public.lessons to authenticated;
grant insert (
  external_id,
  course_id,
  module_title,
  title,
  body,
  video_url,
  duration_minutes,
  position,
  is_published,
  created_at
) on public.lessons to authenticated;
grant update (
  course_id,
  module_title,
  title,
  body,
  video_url,
  duration_minutes,
  position,
  is_published
) on public.lessons to authenticated;

notify pgrst, 'reload schema';

-- Result: SELECT for enrolled students/staff; INSERT and UPDATE for staff only.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'lessons'
order by policyname;


-- 202610020003_workspace_data_layer.sql
-- Gradexa existing schema extension. Run AFTER migrations 001/002 (courses/enrollments/lessons).
-- No auth users, existing rows or local browser data are removed.

create schema if not exists gradexa_private;
revoke all on schema gradexa_private from public, anon;
grant usage on schema gradexa_private to authenticated;

alter table public.quizzes add column if not exists external_id text;
update public.quizzes set external_id = id::text where external_id is null;
alter table public.quizzes alter column external_id set not null;
create unique index if not exists quizzes_external_id_unique on public.quizzes(external_id);
alter table public.quizzes add column if not exists max_attempts integer not null default 3 check(max_attempts between 1 and 10);
alter table public.quizzes add column if not exists revision uuid not null default gen_random_uuid();
alter table public.quiz_questions add column if not exists external_id text;
update public.quiz_questions set external_id = id::text where external_id is null;
alter table public.quiz_questions alter column external_id set not null;
alter table public.quiz_questions add column if not exists points integer not null default 1 check(points between 1 and 100);
create unique index if not exists questions_external_id_per_quiz on public.quiz_questions(quiz_id, external_id);
alter table public.quiz_attempts add column if not exists request_id uuid;
alter table public.quiz_attempts add column if not exists quiz_revision uuid;
alter table public.quiz_attempts add column if not exists course_slug text;
alter table public.quiz_attempts add column if not exists quiz_title text;
alter table public.quiz_attempts add column if not exists student_name text;
update public.quiz_attempts a set course_slug = c.slug, quiz_title = q.title, student_name = p.full_name
from public.quizzes q, public.courses c, public.profiles p
where q.id = a.quiz_id and c.id = q.course_id and p.id = a.student_id and a.course_slug is null;
create unique index if not exists attempts_request_unique on public.quiz_attempts(student_id, request_id) where request_id is not null;
alter table public.profiles add column if not exists language text not null default 'uz' check(language in ('uz','en','ru'));
alter table public.profiles add column if not exists avatar text not null default '' check(length(avatar) <= 400000 and (avatar = '' or avatar ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'));
alter table public.workspace_settings add column if not exists show_notifications boolean not null default true;

-- Invitation drafts are not Auth users and never grant login access.
create table if not exists public.student_invitation_drafts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(length(full_name) between 2 and 100),
  email text not null check(length(email) between 3 and 160 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  bio text not null default '' check(length(bio) <= 1000),
  course_slugs text[] not null check(cardinality(course_slugs) between 1 and 500),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists invitation_draft_email_unique on public.student_invitation_drafts(lower(email));
alter table public.student_invitation_drafts enable row level security;
revoke all on public.student_invitation_drafts from anon, authenticated;
grant select on public.student_invitation_drafts to authenticated;
drop policy if exists invitation_drafts_staff on public.student_invitation_drafts;
create policy invitation_drafts_staff on public.student_invitation_drafts for select to authenticated using(public.is_gradexa_staff());

-- Answer keys must never be available through a student's direct table SELECT.
drop policy if exists quiz_questions_read_enrolled_or_staff on public.quiz_questions;
drop policy if exists quiz_questions_read_staff on public.quiz_questions;
create policy quiz_questions_read_staff on public.quiz_questions for select to authenticated using(public.is_gradexa_staff());
drop policy if exists quiz_questions_answer_key_guard on public.quiz_questions;
create policy quiz_questions_answer_key_guard on public.quiz_questions as restrictive for select to authenticated using(public.is_gradexa_staff());
-- Pausing an account must also stop direct data API reads, not just page navigation.
create or replace function gradexa_private.active_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role in ('owner','admin','student'))
$$;
revoke all on function gradexa_private.active_account() from public,anon;
grant execute on function gradexa_private.active_account() to authenticated;
do $$ declare tab text; begin
  foreach tab in array array['lessons','enrollments','lesson_progress','quizzes','quiz_questions','quiz_attempts','workspace_settings','quick_tasks','student_invitation_drafts'] loop
    execute format('drop policy if exists gradexa_active_account_guard on public.%I',tab);
    execute format('create policy gradexa_active_account_guard on public.%I as restrictive for select to authenticated using(gradexa_private.active_account())',tab);
  end loop;
end $$;
-- Writes below go through checked transactions; never accept a client-supplied score/role.
revoke insert, update, delete on public.quizzes, public.quiz_questions, public.quiz_attempts,
  public.lesson_progress, public.profiles, public.workspace_settings, public.quick_tasks from anon, authenticated;

create or replace function gradexa_private.workspace_read(p_kind text, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles; staff boolean; result jsonb;
begin
  select * into actor from public.profiles where id = auth.uid() and status = 'active';
  if not found then raise exception 'GRADEXA: Faol akkaunt bilan qayta kiring.' using errcode='42501'; end if;
  staff := actor.role in ('admin','owner');
  if p_offset < 0 then raise exception 'GRADEXA: Noto‘g‘ri sahifa.'; end if;
  if p_kind = 'students' then
    select coalesce(jsonb_agg(x.value order by x.id), '[]'::jsonb) into result from (
      select p.id, jsonb_build_object('id',p.id,'name',p.full_name,'email',p.email,'bio',p.bio,'status',p.status,
        'language',p.language,'avatar',p.avatar,'createdAt',p.created_at,'updatedAt',p.updated_at,'invitation',false,
        'courseIds',coalesce((select jsonb_agg(c.slug order by c.slug) from public.enrollments e join public.courses c on c.id=e.course_id where e.student_id=p.id and e.status='active'),'[]'::jsonb)) value
      from public.profiles p where p.role='student' and (staff or p.id=actor.id)
      union all
      select d.id, jsonb_build_object('id',d.id,'name',d.full_name,'email',d.email,'bio',d.bio,'status','invited',
        'courseIds',d.course_slugs,'createdAt',d.created_at,'updatedAt',d.updated_at,'invitation',true)
        || case when d.expires_at is null then '{}'::jsonb else jsonb_build_object('invitationExpiresAt',d.expires_at) end
      from public.student_invitation_drafts d where staff
      order by id limit 100 offset p_offset
    ) x;
  elsif p_kind = 'quizzes' then
    select coalesce(jsonb_agg(x.value order by x.id),'[]'::jsonb) into result from (
      select q.id, jsonb_build_object('id',q.external_id,'courseId',c.slug,'title',q.title,'passScore',q.pass_score,
        'maxAttempts',q.max_attempts,'published',q.is_published,'revision',q.revision,
        'questions',coalesce((select jsonb_agg(jsonb_build_object('id',a.external_id,'text',a.prompt,'options',a.options,'points',a.points)
          || case when staff then jsonb_build_object('correct',a.correct_index,'explanation',a.explanation) else '{}'::jsonb end order by a.position)
          from public.quiz_questions a where a.quiz_id=q.id),'[]'::jsonb)) value
      from public.quizzes q join public.courses c on c.id=q.course_id
      where staff or (actor.role='student' and q.is_published and c.status='published' and exists(
        select 1 from public.enrollments e where e.student_id=actor.id and e.course_id=q.course_id and e.status='active'))
      order by q.id limit 100 offset p_offset
    ) x;
  elsif p_kind = 'attempts' then
    select coalesce(jsonb_agg(x.value order by x.id),'[]'::jsonb) into result from (
      select a.id, jsonb_build_object('id',a.id,'quizId',q.external_id,'studentId',a.student_id,'courseId',a.course_slug,
        'title',a.quiz_title,'studentName',a.student_name,'createdAt',a.created_at,'score',a.score,'passScore',a.pass_score,
        'answers',a.answers,'questions',a.question_snapshot) value
      from public.quiz_attempts a join public.quizzes q on q.id=a.quiz_id
      where staff or a.student_id=actor.id order by a.id limit 100 offset p_offset
    ) x;
  elsif p_kind = 'progress' then
    select coalesce(jsonb_agg(x.value order by x.student_id,x.lesson_id),'[]'::jsonb) into result from (
      select p.student_id,p.lesson_id,jsonb_build_object('studentId',p.student_id,'lessonId',l.external_id,'completed',p.is_completed,
        'note',case when p.student_id=actor.id then p.note else '' end) value
      from public.lesson_progress p join public.lessons l on l.id=p.lesson_id
      where staff or p.student_id=actor.id order by p.student_id,p.lesson_id limit 100 offset p_offset
    ) x;
  elsif p_kind = 'preferences' then
    select coalesce(jsonb_agg(jsonb_build_object('weeklyGoal',weekly_goal,'compact',compact,'ownerBio',owner_bio,
      'showNotifications',show_notifications,'updatedAt',updated_at)),'[]'::jsonb) into result
    from public.workspace_settings where id and p_offset=0;
  elsif p_kind = 'tasks' then
    select coalesce(jsonb_agg(x.value order by x.id),'[]'::jsonb) into result from (
      select t.id,jsonb_build_object('id',t.id,'title',t.title,'completed',t.is_completed,'updatedAt',t.updated_at,'dueAt',t.due_at) value
      from public.quick_tasks t where staff order by t.id limit 100 offset p_offset
    ) x;
  else raise exception 'GRADEXA: Noma’lum bo‘lim.';
  end if;
  return result;
end $$;

create or replace function gradexa_private.workspace_write(p_kind text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles; target public.profiles; staff boolean; c public.courses; q public.quizzes;
  l public.lessons; a public.quiz_attempts; draft public.student_invitation_drafts; t public.quick_tasks;
  item jsonb; questions jsonb; options jsonb; slugs text[]; qid uuid; rid uuid; pos integer;
  earned integer := 0; possible integer := 0; answer integer; point integer; score integer; key text;
begin
  select * into actor from public.profiles where id=auth.uid() and status='active' for share;
  if not found then raise exception 'GRADEXA: Faol akkaunt bilan qayta kiring.' using errcode='42501'; end if;
  staff := actor.role in ('admin','owner');
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'GRADEXA: Noto‘g‘ri ma’lumot.'; end if;
  if p_kind in ('quiz','quiz-import','student','preferences','task') and not staff then
    raise exception 'GRADEXA: Administrator huquqi kerak.' using errcode='42501';
  end if;

  if p_kind in ('quiz','quiz-import') then
    if coalesce(p_data->>'id','') !~ '^[a-zA-Z0-9-]{1,80}$' then raise exception 'GRADEXA: Test identifikatori noto‘g‘ri.'; end if;
    perform pg_advisory_xact_lock(hashtextextended('gradexa-quiz:'||(p_data->>'id'),0));
    select * into c from public.courses where slug=p_data->>'courseId' for share;
    if not found then raise exception 'GRADEXA: Kurs topilmadi. Avval kursni saqlang.'; end if;
    select * into q from public.quizzes where external_id=p_data->>'id' for update;
    if found then
      if p_kind='quiz-import' then return jsonb_build_object('id',q.external_id,'skipped',true); end if;
      if q.revision::text is distinct from p_data->>'revision' then raise exception 'GRADEXA: Test boshqa oynada o‘zgargan. Sahifani yangilang.'; end if;
      if c.id<>q.course_id and exists(select 1 from public.quiz_attempts where quiz_id=q.id) then
        raise exception 'GRADEXA: Natijasi bor testning kursini o‘zgartirib bo‘lmaydi. Nusxa yarating.';
      end if;
      qid:=q.id;
      update public.quizzes set course_id=c.id,title=trim(p_data->>'title'),pass_score=(p_data->>'passScore')::integer,
        max_attempts=coalesce((p_data->>'maxAttempts')::integer,3),is_published=(p_data->>'published')::boolean,revision=gen_random_uuid() where id=qid;
    else
      if p_data->>'revision' is not null then raise exception 'GRADEXA: Tahrirlanayotgan test topilmadi.'; end if;
      insert into public.quizzes(external_id,course_id,title,pass_score,max_attempts,is_published)
      values(p_data->>'id',c.id,trim(p_data->>'title'),(p_data->>'passScore')::integer,coalesce((p_data->>'maxAttempts')::integer,3),(p_data->>'published')::boolean) returning id into qid;
    end if;
    questions:=p_data->'questions';
    if jsonb_typeof(questions) is distinct from 'array' or jsonb_array_length(questions) not between 1 and 30 then raise exception 'GRADEXA: 1–30 ta savol kerak.'; end if;
    delete from public.quiz_questions where quiz_id=qid;
    pos:=0;
    for item in select value from jsonb_array_elements(questions) loop
      pos:=pos+1; options:=item->'options';
      if coalesce(item->>'id','') !~ '^[a-zA-Z0-9-]{1,80}$' then raise exception 'GRADEXA: Savol identifikatori noto‘g‘ri.'; end if;
      if jsonb_typeof(options) is distinct from 'array' or jsonb_array_length(options)<>4 then raise exception 'GRADEXA: Har savolga to‘rtta javob kerak.'; end if;
      if exists(select 1 from jsonb_array_elements(options) v where jsonb_typeof(v)<>'string' or length(trim(v#>>'{}')) not between 1 and 500) then raise exception 'GRADEXA: Javob variantlarini to‘ldiring.'; end if;
      insert into public.quiz_questions(quiz_id,external_id,prompt,options,correct_index,explanation,position,points)
      values(qid,item->>'id',trim(item->>'text'),options,(item->>'correct')::integer,coalesce(item->>'explanation',''),pos,coalesce((item->>'points')::integer,1));
    end loop;
    return jsonb_build_object('id',p_data->>'id');

  elsif p_kind='submit' then
    if actor.role<>'student' then raise exception 'GRADEXA: Talaba akkaunti kerak.' using errcode='42501'; end if;
    rid:=(p_data->>'requestId')::uuid;
    if rid is null then raise exception 'GRADEXA: Urinish identifikatori kerak.'; end if;
    perform pg_advisory_xact_lock(hashtextextended('gradexa-attempt:'||actor.id::text||':'||rid::text,0));
    select * into a from public.quiz_attempts where student_id=actor.id and request_id=rid;
    if found then
      select * into q from public.quizzes where id=a.quiz_id;
      if q.external_id is distinct from p_data->>'quizId' or a.answers is distinct from p_data->'answers' or a.quiz_revision::text is distinct from p_data->>'revision' then raise exception 'GRADEXA: Urinish allaqachon boshqa javoblar bilan saqlangan.'; end if;
      return jsonb_build_object('id',a.id);
    end if;
    select c1.* into c from public.courses c1 join public.quizzes q1 on q1.course_id=c1.id where q1.external_id=p_data->>'quizId' and c1.status='published' for share of c1;
    if not found then raise exception 'GRADEXA: Nashr qilingan kurs topilmadi.'; end if;
    select * into q from public.quizzes where external_id=p_data->>'quizId' and is_published and course_id=c.id for update;
    if not found then raise exception 'GRADEXA: Test nashr qilinmagan.'; end if;
    perform 1 from public.enrollments where course_id=c.id and student_id=actor.id and status='active' for share;
    if not found then raise exception 'GRADEXA: Faol kursga yozilish kerak.'; end if;
    if q.revision::text is distinct from p_data->>'revision' then raise exception 'GRADEXA: Test yangilangan. Sahifani yangilab, qayta boshlang.'; end if;
    if (select count(*) from public.quiz_attempts where quiz_id=q.id and student_id=actor.id)>=q.max_attempts then raise exception 'GRADEXA: Urinishlar tugagan.'; end if;
    select jsonb_agg(jsonb_build_object('id',qq.external_id,'text',qq.prompt,'options',qq.options,'correct',qq.correct_index,'explanation',qq.explanation,'points',qq.points) order by qq.position)
      into questions from public.quiz_questions qq where qq.quiz_id=q.id;
    if questions is null or jsonb_typeof(p_data->'answers') is distinct from 'array' or jsonb_array_length(p_data->'answers')<>jsonb_array_length(questions) then raise exception 'GRADEXA: Barcha savollarga javob bering.'; end if;
    pos:=0;
    for item in select value from jsonb_array_elements(questions) loop
      if jsonb_typeof(p_data->'answers'->pos) is distinct from 'number' or (p_data->'answers'->>pos) !~ '^[0-3]$' then raise exception 'GRADEXA: Javob raqami noto‘g‘ri.'; end if;
      answer:=(p_data->'answers'->>pos)::integer; point:=(item->>'points')::integer;
      possible:=possible+point;
      if answer=(item->>'correct')::integer then earned:=earned+point; end if;
      pos:=pos+1;
    end loop;
    score:=round(100.0*earned/possible)::integer;
    insert into public.quiz_attempts(quiz_id,student_id,score,pass_score,answers,question_snapshot,request_id,quiz_revision,course_slug,quiz_title,student_name)
    values(q.id,actor.id,score,q.pass_score,p_data->'answers',questions,rid,q.revision,c.slug,q.title,actor.full_name) returning id into qid;
    return jsonb_build_object('id',qid);

  elsif p_kind in ('completion','note') then
    if actor.role<>'student' then raise exception 'GRADEXA: Talaba akkaunti kerak.' using errcode='42501'; end if;
    perform pg_advisory_xact_lock(hashtextextended('gradexa-progress:'||actor.id::text,0));
    select c1.* into c from public.courses c1 join public.lessons l1 on l1.course_id=c1.id where l1.external_id=p_data->>'lessonId' and c1.status='published' for share of c1;
    if not found then raise exception 'GRADEXA: Kurs nashr qilinmagan.'; end if;
    select * into l from public.lessons where external_id=p_data->>'lessonId' and course_id=c.id and is_published for share;
    if not found then raise exception 'GRADEXA: Dars topilmadi.'; end if;
    perform 1 from public.enrollments where student_id=actor.id and course_id=c.id and status='active' for share;
    if not found then raise exception 'GRADEXA: Kursga yozilish kerak.'; end if;
    if c.sequential and exists(select 1 from public.lessons prior where prior.course_id=c.id and prior.is_published
      and (prior.position,prior.module_title collate "C",prior.external_id collate "C")<(l.position,l.module_title collate "C",l.external_id collate "C")
      and not exists(select 1 from public.lesson_progress p where p.student_id=actor.id and p.lesson_id=prior.id and p.is_completed)) then raise exception 'GRADEXA: Avvalgi darslarni yakunlang.'; end if;
    if p_kind='completion' then
      if jsonb_typeof(p_data->'completed') is distinct from 'boolean' then raise exception 'GRADEXA: Dars holati kerak.'; end if;
      insert into public.lesson_progress(student_id,lesson_id,is_completed,completed_at)
      values(actor.id,l.id,(p_data->>'completed')::boolean,case when (p_data->>'completed')::boolean then now() end)
      on conflict(student_id,lesson_id) do update set is_completed=excluded.is_completed,completed_at=excluded.completed_at;
    else
      insert into public.lesson_progress(student_id,lesson_id,note) values(actor.id,l.id,p_data->>'note')
      on conflict(student_id,lesson_id) do update set note=excluded.note;
    end if;
    return jsonb_build_object('id',l.external_id);

  elsif p_kind='profile' then
    -- Only the authenticated profile; role, email and status are immutable here.
    update public.profiles set full_name=trim(p_data->>'name'),initials=upper(left(trim(p_data->>'name'),2)),bio=p_data->>'bio',language=p_data->>'language',avatar=p_data->>'avatar'
    where id=actor.id and updated_at=(p_data->>'updatedAt')::timestamptz returning updated_at::text into key;
    if not found then raise exception 'GRADEXA: Profil o‘zgargan. Sahifani yangilang.'; end if;
    return jsonb_build_object('id',actor.id,'updatedAt',key::timestamptz);

  elsif p_kind='student' then
    rid:=(p_data->>'id')::uuid;
    if jsonb_typeof(p_data->'courseIds') is distinct from 'array' or jsonb_array_length(p_data->'courseIds')>500 then raise exception 'GRADEXA: Kurslar ro‘yxati noto‘g‘ri.'; end if;
    select coalesce(array_agg(distinct value),'{}'::text[]) into slugs from jsonb_array_elements_text(p_data->'courseIds');
    if exists(select 1 from unnest(slugs) s where not exists(select 1 from public.courses where slug=s)) then raise exception 'GRADEXA: Tanlangan kurs topilmadi.'; end if;
    select * into target from public.profiles where id=rid and role='student' for update;
    if found then
      if target.updated_at is distinct from (p_data->>'updatedAt')::timestamptz then raise exception 'GRADEXA: Talaba ma’lumoti o‘zgargan. Sahifani yangilang.'; end if;
      if p_data->>'status' not in ('active','paused') or p_data->>'status' is null then raise exception 'GRADEXA: Haqiqiy akkaunt uchun faol/to‘xtatilgan holatini tanlang.'; end if;
      if lower(target.email) is distinct from lower(p_data->>'email') then raise exception 'GRADEXA: Akkaunt emaili bu formadan o‘zgarmaydi.'; end if;
      update public.profiles set full_name=trim(p_data->>'name'),initials=upper(left(trim(p_data->>'name'),2)),status=(p_data->>'status')::public.gradexa_profile_status where id=rid;
      update public.enrollments e set status='paused' where student_id=rid and not exists(select 1 from public.courses c1 where c1.id=e.course_id and c1.slug=any(slugs));
      insert into public.enrollments(student_id,course_id,status) select rid,id,'active'::public.gradexa_enrollment_status from public.courses where slug=any(slugs)
      on conflict(student_id,course_id) do update set status='active';
    else
      if p_data->>'status' is distinct from 'invited' or cardinality(slugs)=0 then raise exception 'GRADEXA: Yangi yozuv faqat kursli taklif qoralamasi bo‘lishi mumkin.'; end if;
      if exists(select 1 from public.profiles where lower(email)=lower(p_data->>'email')) then raise exception 'GRADEXA: Bu email bilan akkaunt mavjud.'; end if;
      select * into draft from public.student_invitation_drafts where id=rid for update;
      if found then
        if draft.updated_at is distinct from (p_data->>'updatedAt')::timestamptz then raise exception 'GRADEXA: Qoralama o‘zgargan. Sahifani yangilang.'; end if;
        update public.student_invitation_drafts set full_name=trim(p_data->>'name'),email=lower(trim(p_data->>'email')),course_slugs=slugs,expires_at=(p_data->>'invitationExpiresAt')::timestamptz,updated_at=clock_timestamp() where id=rid;
      else
        if p_data->>'updatedAt' is not null then raise exception 'GRADEXA: Qoralama topilmadi.'; end if;
        insert into public.student_invitation_drafts(id,full_name,email,course_slugs,expires_at,created_by)
        values(rid,trim(p_data->>'name'),lower(trim(p_data->>'email')),slugs,(p_data->>'invitationExpiresAt')::timestamptz,actor.id);
      end if;
    end if;
    return jsonb_build_object('id',rid);

  elsif p_kind='preferences' then
    update public.workspace_settings set weekly_goal=(p_data->>'weeklyGoal')::integer,compact=(p_data->>'compact')::boolean,owner_bio=p_data->>'ownerBio',show_notifications=(p_data->>'showNotifications')::boolean
    where id and updated_at=(p_data->>'updatedAt')::timestamptz returning updated_at::text into key;
    if not found then raise exception 'GRADEXA: Sozlamalar o‘zgargan. Sahifani yangilang.'; end if;
    return jsonb_build_object('updatedAt',key::timestamptz);
  elsif p_kind='task' then
    rid:=(p_data->>'id')::uuid;
    select * into t from public.quick_tasks where id=rid for update;
    if found then
      if t.updated_at is distinct from (p_data->>'updatedAt')::timestamptz then raise exception 'GRADEXA: Vazifa o‘zgargan. Sahifani yangilang.'; end if;
      update public.quick_tasks set title=trim(p_data->>'title'),is_completed=(p_data->>'completed')::boolean where id=rid;
    else
      if p_data->>'updatedAt' is not null then raise exception 'GRADEXA: Vazifa topilmadi.'; end if;
      insert into public.quick_tasks(id,title,is_completed,created_by) values(rid,trim(p_data->>'title'),(p_data->>'completed')::boolean,actor.id);
    end if;
    return jsonb_build_object('id',rid);
  else raise exception 'GRADEXA: Noma’lum amal.';
  end if;
end $$;

-- Public RPC wrappers run as caller; private implementations validate Auth and roles.
create or replace function public.gradexa_workspace_read(p_kind text, p_offset integer default 0)
returns jsonb language sql security invoker set search_path = '' as $$ select gradexa_private.workspace_read(p_kind,p_offset) $$;
create or replace function public.gradexa_workspace_write(p_kind text,p_data jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select gradexa_private.workspace_write(p_kind,p_data) $$;
revoke all on function gradexa_private.workspace_read(text,integer),gradexa_private.workspace_write(text,jsonb),public.gradexa_workspace_read(text,integer),public.gradexa_workspace_write(text,jsonb) from public,anon;
grant execute on function gradexa_private.workspace_read(text,integer),gradexa_private.workspace_write(text,jsonb),public.gradexa_workspace_read(text,integer),public.gradexa_workspace_write(text,jsonb) to authenticated;
notify pgrst, 'reload schema';

commit;
