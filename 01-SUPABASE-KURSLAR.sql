-- Gradexa: apply once in Supabase SQL Editor before installing the courses update.
-- Existing tables, records, roles and SELECT policies are preserved.
begin;

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
commit;

-- Result: a row for every course policy; INSERT and UPDATE are staff-only.
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'courses' order by policyname;
