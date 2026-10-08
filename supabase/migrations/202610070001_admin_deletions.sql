-- Gradexa: checked deletion commands on the existing data model.
-- Requires the existing workspace and invitation migrations. Running this file
-- does NOT delete any records. Actual deletion requires an authenticated admin.
begin;
select pg_advisory_xact_lock(hashtextextended('gradexa-admin-deletions-migration',0));

-- Reserve an Auth deletion so concurrent edits cannot reactivate its profile.
alter table public.profiles add column if not exists deletion_request uuid;
alter table public.profiles add column if not exists deletion_previous_status public.gradexa_profile_status;
alter table public.profiles add column if not exists deletion_started_at timestamptz;
create or replace function gradexa_private.guard_profile_deletion()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.deletion_request is not null and new.deletion_request is not null then
    if (new.deletion_request is distinct from old.deletion_request or new.deletion_started_at is distinct from old.deletion_started_at)
      and (to_jsonb(new)-array['deletion_request','deletion_started_at','updated_at']) = (to_jsonb(old)-array['deletion_request','deletion_started_at','updated_at']) then return new; end if;
    raise exception 'GRADEXA: Talabani o‘chirish yakunlanmagan. O‘chirish oynasidan qayta urinib ko‘ring.';
  end if;
  return new;
end $$;
revoke all on function gradexa_private.guard_profile_deletion() from public,anon,authenticated;
drop trigger if exists guard_profile_deletion on public.profiles;
create trigger guard_profile_deletion before update on public.profiles for each row execute function gradexa_private.guard_profile_deletion();

-- Invitation history belongs to its student. Auth -> profile -> invitation
-- cascades only when that exact Auth account is deliberately deleted.
do $$ declare constraint_name text; begin
  for constraint_name in select conname from pg_constraint
    where conrelid='public.student_invitation_drafts'::regclass and confrelid='public.profiles'::regclass
      and contype='f' and conkey=array[(select attnum from pg_attribute where attrelid='public.student_invitation_drafts'::regclass and attname='user_id')]::smallint[]
  loop execute format('alter table public.student_invitation_drafts drop constraint %I',constraint_name); end loop;
  alter table public.student_invitation_drafts add constraint invitation_student_delete_cascade foreign key(user_id) references public.profiles(id) on delete cascade;
end $$;

-- course_slugs is an existing array rather than an FK. Lock referenced courses
-- when creating/changing a draft so concurrent course deletion cannot orphan it.
create or replace function gradexa_private.guard_invitation_courses()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_slug text;
begin
  for v_slug in select distinct unnest(new.course_slugs) order by 1 loop
    perform 1 from public.courses c where c.slug=v_slug for key share;
    if not found then raise exception 'GRADEXA: Taklif kursi topilmadi. Kurslar ro‘yxatini yangilang.'; end if;
  end loop;
  return new;
end $$;
revoke all on function gradexa_private.guard_invitation_courses() from public,anon,authenticated;
drop trigger if exists guard_invitation_courses on public.student_invitation_drafts;
create trigger guard_invitation_courses before insert or update of course_slugs on public.student_invitation_drafts
  for each row execute function gradexa_private.guard_invitation_courses();

-- Private helper, callable only by checked definer functions below. Row locks
-- serialize FK inserts/normal writes with the final dependency check.
create or replace function gradexa_private.deletion_info(p_kind text,p_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row_data jsonb; counts jsonb:='{}'; label text; blocked text; pending boolean:=false;
  l public.lessons; q public.quizzes; c public.courses; p public.profiles;
  d public.student_invitation_drafts; t public.quick_tasks; target_id uuid;
begin
  if p_id is null or p_id !~ '^[a-zA-Z0-9-]{1,80}$' then raise exception 'GRADEXA: Identifikator noto‘g‘ri.'; end if;
  if p_kind='lesson' then
    select * into l from public.lessons where external_id=p_id for update;
    if not found then raise exception 'GRADEXA: Dars topilmadi. Ro‘yxatni yangilang.'; end if;
    label:=l.title; row_data:=to_jsonb(l);
    counts:=jsonb_build_object('progress',(select count(*) from public.lesson_progress where lesson_id=l.id));
  elsif p_kind='quiz' then
    select * into q from public.quizzes where external_id=p_id for update;
    if not found then raise exception 'GRADEXA: Test topilmadi. Ro‘yxatni yangilang.'; end if;
    label:=q.title; row_data:=to_jsonb(q);
    counts:=jsonb_build_object('results',(select count(*) from public.quiz_attempts where quiz_id=q.id),'questions',(select count(*) from public.quiz_questions where quiz_id=q.id));
    if (counts->>'results')::bigint>0 then blocked:='Test natijalari mavjud. Natijalarni saqlash uchun testni qoralamaga o‘tkazing.'; end if;
  elsif p_kind='course' then
    select * into c from public.courses where slug=p_id for update;
    if not found then raise exception 'GRADEXA: Kurs topilmadi. Ro‘yxatni yangilang.'; end if;
    label:=c.title; row_data:=to_jsonb(c);
    counts:=jsonb_build_object('lessons',(select count(*) from public.lessons where course_id=c.id),'quizzes',(select count(*) from public.quizzes where course_id=c.id),
      'enrollments',(select count(*) from public.enrollments where course_id=c.id),'invitations',(select count(*) from public.student_invitation_drafts where c.slug=any(course_slugs)));
    if exists(select 1 from jsonb_each_text(counts) v where v.value::bigint>0) then blocked:='Kursga bog‘langan yozuvlar mavjud. Ularni saqlash uchun kursni arxivlang.';
    elsif c.status='published' then blocked:='Avval kursni qoralama yoki arxiv holatiga o‘tkazing.'; end if;
  elsif p_kind in ('student','invitation') then
    if p_kind='invitation' then
      select * into d from public.student_invitation_drafts where id=p_id::uuid for update;
      if not found then raise exception 'GRADEXA: Taklif topilmadi. Ro‘yxatni yangilang.'; end if;
      if d.accepted_at is not null then raise exception 'GRADEXA: Taklif qabul qilingan. Talaba profilidan foydalaning.'; end if;
      target_id:=d.user_id; label:=d.full_name; row_data:=to_jsonb(d);
      if d.delivery_state='sending' then blocked:='Taklif yuborish yakunlanmagan. Yuborish natijasini avval tekshiring.';
      elsif target_id is null and d.provision_token is not null then blocked:='Taklif hisobining holati noma’lum. Avval taklifni qayta yuborib holatini tiklang.'; end if;
    else target_id:=p_id::uuid; end if;
    if target_id is not null then
      select * into p from public.profiles where id=target_id for update;
      if not found or p.role<>'student' then raise exception 'GRADEXA: Faqat talaba hisobini o‘chirish mumkin.' using errcode='42501'; end if;
      label:=p.full_name; row_data:=jsonb_build_object('profile',to_jsonb(p),'invitation',row_data);
      pending:=p.deletion_request is not null;
      counts:=jsonb_build_object('enrollments',(select count(*) from public.enrollments where student_id=p.id),'results',(select count(*) from public.quiz_attempts where student_id=p.id),
        'progress',(select count(*) from public.lesson_progress where student_id=p.id),'invitations',(select count(*) from public.student_invitation_drafts where user_id=p.id));
    end if;
  elsif p_kind='task' then
    select * into t from public.quick_tasks where id=p_id::uuid for update;
    if not found then raise exception 'GRADEXA: Vazifa topilmadi. Ro‘yxatni yangilang.'; end if;
    label:=t.title; row_data:=to_jsonb(t);
  else raise exception 'GRADEXA: Noma’lum o‘chirish amali.'; end if;
  return jsonb_build_object('kind',p_kind,'id',p_id,'name',label,'counts',counts,'blocked',blocked,'pending',pending,
    'authAccount',target_id is not null,'fingerprint',md5(jsonb_build_object('row',row_data,'counts',counts)::text));
end $$;
revoke all on function gradexa_private.deletion_info(text,text) from public,anon,authenticated,service_role;

create or replace function public.gradexa_deletion_preview(p_kind text,p_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.profiles where id=auth.uid() and role in ('admin','owner') and status='active' for share;
  if not found then raise exception 'GRADEXA: Faol administrator hisobi kerak.' using errcode='42501'; end if;
  return gradexa_private.deletion_info(p_kind,p_id);
end $$;
revoke all on function public.gradexa_deletion_preview(text,text) from public,anon;
grant execute on function public.gradexa_deletion_preview(text,text) to authenticated;

create or replace function public.gradexa_delete_record(p_kind text,p_id text,p_fingerprint text,p_confirmation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare info jsonb;
begin
  perform 1 from public.profiles where id=auth.uid() and role in ('admin','owner') and status='active' for share;
  if not found then raise exception 'GRADEXA: Faol administrator hisobi kerak.' using errcode='42501'; end if;
  info:=gradexa_private.deletion_info(p_kind,p_id);
  if info->>'fingerprint' is distinct from p_fingerprint or info->>'name' is distinct from trim(p_confirmation) then
    raise exception 'GRADEXA: Yozuv yoki bog‘langan ma’lumotlar o‘zgargan. Qayta tekshirib tasdiqlang.'; end if;
  if info->>'blocked' is not null then raise exception 'GRADEXA: %',info->>'blocked'; end if;
  if (info->>'authAccount')::boolean or p_kind='student' then raise exception 'GRADEXA: Talaba hisobi server orqali o‘chiriladi.' using errcode='42501'; end if;
  case p_kind
    when 'lesson' then delete from public.lessons where external_id=p_id;
    when 'quiz' then delete from public.quizzes where external_id=p_id;
    when 'course' then delete from public.courses where slug=p_id;
    when 'invitation' then delete from public.student_invitation_drafts where id=p_id::uuid;
    when 'task' then delete from public.quick_tasks where id=p_id::uuid;
    else raise exception 'GRADEXA: Noma’lum o‘chirish amali.';
  end case;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gradexa_delete_record(text,text,text,text) from public,anon;
grant execute on function public.gradexa_delete_record(text,text,text,text) to authenticated;

-- Auth removal uses Supabase Admin API on the server, never SQL DELETE auth.users.
create or replace function public.gradexa_prepare_student_delete(p_actor uuid,p_kind text,p_id text,p_fingerprint text,p_confirmation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare info jsonb; target_id uuid; target public.profiles; request uuid; can_restore boolean;
begin
  perform 1 from public.profiles where id=p_actor and role in ('admin','owner') and status='active' for share;
  if not found then raise exception 'GRADEXA: Faol administrator hisobi kerak.' using errcode='42501'; end if;
  if p_kind not in ('student','invitation') or p_kind is null then raise exception 'GRADEXA: Noto‘g‘ri hisob turi.'; end if;
  info:=gradexa_private.deletion_info(p_kind,p_id);
  if info->>'fingerprint' is distinct from p_fingerprint or info->>'name' is distinct from trim(p_confirmation) then
    raise exception 'GRADEXA: Yozuv yoki bog‘langan ma’lumotlar o‘zgargan. Qayta tekshirib tasdiqlang.'; end if;
  if info->>'blocked' is not null then raise exception 'GRADEXA: %',info->>'blocked'; end if;
  if p_kind='student' then target_id:=p_id::uuid;
  else select user_id into target_id from public.student_invitation_drafts where id=p_id::uuid; end if;
  if target_id is null or target_id=p_actor then raise exception 'GRADEXA: Faqat boshqa talaba hisobini o‘chirish mumkin.' using errcode='42501'; end if;
  select * into target from public.profiles where id=target_id and role='student' for update;
  if not found then raise exception 'GRADEXA: Talaba hisobi topilmadi.'; end if;
  can_restore:=target.deletion_request is null;
  if not can_restore and target.deletion_started_at>clock_timestamp()-interval '5 minutes' then
    raise exception 'GRADEXA: Hisobni o‘chirish so‘rovi ishlanmoqda. Besh daqiqadan so‘ng ro‘yxatni yangilab qayta tekshiring.';
  end if;
  request:=gen_random_uuid();
  if can_restore then
    update public.profiles set deletion_request=request,deletion_previous_status=status,status='paused',deletion_started_at=clock_timestamp() where id=target_id;
  else
    update public.profiles set deletion_request=request,deletion_started_at=clock_timestamp() where id=target_id;
  end if;
  return jsonb_build_object('userId',target_id,'requestId',request,'canRestore',can_restore);
end $$;
revoke all on function public.gradexa_prepare_student_delete(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.gradexa_prepare_student_delete(uuid,text,text,text,text) to service_role;

-- Only after a definite Auth rejection (not a timeout) may the service restore
-- the previous status. The request token prevents reverting a newer operation.
create or replace function public.gradexa_abort_student_delete(p_actor uuid,p_user uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.profiles where id=p_actor and role in ('admin','owner') and status='active' for share;
  if not found then raise exception 'GRADEXA: Faol administrator hisobi kerak.' using errcode='42501'; end if;
  update public.profiles set status=coalesce(deletion_previous_status,'paused'),deletion_request=null,deletion_previous_status=null,deletion_started_at=null
    where id=p_user and role='student' and deletion_request=p_request and p_request is not null;
  return jsonb_build_object('restored',found);
end $$;
revoke all on function public.gradexa_abort_student_delete(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.gradexa_abort_student_delete(uuid,uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
