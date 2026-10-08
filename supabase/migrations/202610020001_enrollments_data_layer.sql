-- Gradexa: current students persist their own course enrollment in Supabase.
-- Existing tables, rows and read policies are preserved.
begin;

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
commit;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'enrollments'
order by policyname;
