-- Gradexa V2: users, courses, lessons, quizzes, progress and dashboard tasks.
-- Run once in Supabase SQL Editor. Authentication users remain owned by auth.users.

create extension if not exists pgcrypto;

create type public.gradexa_role as enum ('owner', 'admin', 'student');
create type public.gradexa_profile_status as enum ('active', 'invited', 'paused');
create type public.gradexa_course_status as enum ('draft', 'published', 'archived');
create type public.gradexa_enrollment_status as enum ('active', 'completed', 'paused');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 2 and 100),
  initials text not null check (char_length(initials) between 1 and 4),
  role public.gradexa_role not null default 'student',
  status public.gradexa_profile_status not null default 'active',
  bio text not null default '' check (char_length(bio) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email));
create index profiles_role_status_index on public.profiles (role, status);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 1500),
  category text not null check (char_length(category) between 2 and 60),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  status public.gradexa_course_status not null default 'draft',
  instructor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_status_updated_index on public.courses (status, updated_at desc);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_title text not null check (char_length(module_title) between 1 and 100),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 20 and 30000),
  video_url text not null default '' check (video_url = '' or video_url ~ '^https://'),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  position integer not null check (position between 1 and 999),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create index lessons_course_index on public.lessons (course_id, position);

create table public.enrollments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.gradexa_enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (student_id, course_id)
);

create index enrollments_course_status_index on public.enrollments (course_id, status);

create table public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  note text not null default '' check (char_length(note) <= 10000),
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  pass_score integer not null check (pass_score between 1 and 100),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quizzes_course_index on public.quizzes (course_id, created_at desc);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 3 and 1000),
  options jsonb not null check (
    jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4
  ),
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null default '' check (char_length(explanation) <= 2000),
  position integer not null check (position between 1 and 30),
  unique (quiz_id, position)
);

create index quiz_questions_quiz_index on public.quiz_questions (quiz_id, position);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  pass_score integer not null check (pass_score between 1 and 100),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  question_snapshot jsonb not null check (jsonb_typeof(question_snapshot) = 'array'),
  created_at timestamptz not null default now()
);

create index quiz_attempts_student_index on public.quiz_attempts (student_id, created_at desc);
create index quiz_attempts_quiz_index on public.quiz_attempts (quiz_id, created_at desc);

create table public.workspace_settings (
  id boolean primary key default true check (id),
  weekly_goal integer not null default 5 check (weekly_goal between 1 and 40),
  compact boolean not null default false,
  owner_bio text not null default 'Ta’lim orqali yangi imkoniyatlar yaratamiz.'
    check (char_length(owner_bio) <= 1000),
  updated_at timestamptz not null default now()
);

insert into public.workspace_settings (id) values (true);

create table public.quick_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  due_at timestamptz,
  is_completed boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quick_tasks_due_index on public.quick_tasks (is_completed, due_at);

create or replace function public.set_gradexa_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_gradexa_updated_at();
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_gradexa_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_gradexa_updated_at();
create trigger lesson_progress_set_updated_at before update on public.lesson_progress
for each row execute function public.set_gradexa_updated_at();
create trigger quizzes_set_updated_at before update on public.quizzes
for each row execute function public.set_gradexa_updated_at();
create trigger workspace_settings_set_updated_at before update on public.workspace_settings
for each row execute function public.set_gradexa_updated_at();
create trigger quick_tasks_set_updated_at before update on public.quick_tasks
for each row execute function public.set_gradexa_updated_at();

create or replace function public.create_gradexa_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Gradexa student'
  );

  insert into public.profiles (id, email, full_name, initials)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@no-email.local'),
    display_name,
    upper(left(display_name, 2))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger create_gradexa_profile_after_signup
after insert on auth.users
for each row execute function public.create_gradexa_profile();

-- Backfill users that existed before this migration.
insert into public.profiles (id, email, full_name, initials)
select
  users.id,
  coalesce(users.email, users.id::text || '@no-email.local'),
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Gradexa student'
  ),
  upper(left(coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'ST'
  ), 2))
from auth.users as users
on conflict (id) do nothing;

create or replace function public.is_gradexa_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
  );
$$;

revoke all on function public.is_gradexa_staff() from public;
grant execute on function public.is_gradexa_staff() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.quick_tasks enable row level security;

create policy profiles_read_self_or_staff on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_gradexa_staff());

create policy courses_read_published_or_staff on public.courses
for select to anon, authenticated
using (status = 'published' or public.is_gradexa_staff());

create policy lessons_read_enrolled_or_staff on public.lessons
for select to authenticated
using (
  public.is_gradexa_staff()
  or (
    is_published
    and exists (
      select 1 from public.enrollments
      where enrollments.student_id = auth.uid()
        and enrollments.course_id = lessons.course_id
        and enrollments.status = 'active'
    )
  )
);

create policy enrollments_read_self_or_staff on public.enrollments
for select to authenticated
using (student_id = auth.uid() or public.is_gradexa_staff());

create policy lesson_progress_read_self_or_staff on public.lesson_progress
for select to authenticated
using (student_id = auth.uid() or public.is_gradexa_staff());

create policy quizzes_read_enrolled_or_staff on public.quizzes
for select to authenticated
using (
  public.is_gradexa_staff()
  or (
    is_published
    and exists (
      select 1 from public.enrollments
      where enrollments.student_id = auth.uid()
        and enrollments.course_id = quizzes.course_id
        and enrollments.status = 'active'
    )
  )
);

create policy quiz_questions_read_enrolled_or_staff on public.quiz_questions
for select to authenticated
using (
  public.is_gradexa_staff()
  or exists (
    select 1
    from public.quizzes
    join public.enrollments on enrollments.course_id = quizzes.course_id
    where quizzes.id = quiz_questions.quiz_id
      and quizzes.is_published
      and enrollments.student_id = auth.uid()
      and enrollments.status = 'active'
  )
);

create policy quiz_attempts_read_self_or_staff on public.quiz_attempts
for select to authenticated
using (student_id = auth.uid() or public.is_gradexa_staff());

create policy workspace_settings_read_authenticated on public.workspace_settings
for select to authenticated using (true);

create policy quick_tasks_read_staff on public.quick_tasks
for select to authenticated using (public.is_gradexa_staff());

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.courses from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.enrollments from anon, authenticated;
revoke all on table public.lesson_progress from anon, authenticated;
revoke all on table public.quizzes from anon, authenticated;
revoke all on table public.quiz_questions from anon, authenticated;
revoke all on table public.quiz_attempts from anon, authenticated;
revoke all on table public.workspace_settings from anon, authenticated;
revoke all on table public.quick_tasks from anon, authenticated;

grant select on public.courses to anon, authenticated;
grant select on public.profiles, public.lessons, public.enrollments,
  public.lesson_progress, public.quizzes, public.quiz_questions,
  public.quiz_attempts, public.workspace_settings, public.quick_tasks
to authenticated;

