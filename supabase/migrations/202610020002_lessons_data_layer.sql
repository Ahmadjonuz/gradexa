-- Gradexa: run once in Supabase SQL Editor before installing the lessons update.
-- Existing lesson rows are preserved. DELETE is intentionally not granted.
begin;

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
commit;

-- Result: SELECT for enrolled students/staff; INSERT and UPDATE for staff only.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'lessons'
order by policyname;
