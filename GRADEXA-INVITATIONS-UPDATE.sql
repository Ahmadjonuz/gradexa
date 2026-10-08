-- Existing Gradexa foundation + 202610020003 workspace migration are required.
-- Additive migration: no tables/data are removed, no RLS policy is disabled.
begin;
select pg_advisory_xact_lock(hashtextextended('gradexa-invitations-migration',0));

alter table public.student_invitation_drafts
  add column if not exists delivery_state text not null default 'draft' check (delivery_state in ('draft','sending','sent','failed')),
  add column if not exists provision_token uuid,
  add column if not exists dispatch_claim uuid,
  add column if not exists attempted_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists user_id uuid references public.profiles(id) on delete restrict;
create unique index if not exists invitation_user_unique on public.student_invitation_drafts(user_id) where user_id is not null;

-- Freeze recipient/course selection after the first dispatch. A stale editor must
-- never change the recipient while the external email request is in progress.
create or replace function gradexa_private.guard_dispatched_invitation()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.provision_token is not null and
    (new.full_name,new.email,new.course_slugs) is distinct from (old.full_name,old.email,old.course_slugs) then
    raise exception 'GRADEXA: Yuborilgan taklifni o‘zgartirib bo‘lmaydi. Qabul qilingach talaba profilini tahrirlang.';
  end if;
  return new;
end $$;
drop trigger if exists guard_dispatched_invitation on public.student_invitation_drafts;
create trigger guard_dispatched_invitation before update on public.student_invitation_drafts
  for each row execute function gradexa_private.guard_dispatched_invitation();
revoke all on function gradexa_private.guard_dispatched_invitation() from public,anon,authenticated;

-- Only the server secret client can reserve a send. The actor is read from the
-- authenticated session by the server action and rechecked against profiles here.
create or replace function public.gradexa_prepare_invitation(p_actor uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.student_invitation_drafts; u auth.users; rid uuid; slugs text[]; v_name text; v_email text;
begin
  perform 1 from public.profiles where id=p_actor and role in ('owner','admin') and status='active' for share;
  if not found then raise exception 'GRADEXA: Faol administrator hisobi kerak.' using errcode='42501'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or p_data->>'status' is distinct from 'invited' then raise exception 'GRADEXA: Taklif ma’lumoti noto‘g‘ri.'; end if;
  rid:=(p_data->>'id')::uuid; v_name:=trim(p_data->>'name'); v_email:=lower(trim(p_data->>'email'));
  if rid is null or v_name is null or length(v_name) not between 2 and 100 or v_email is null or length(v_email)>160 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'GRADEXA: Ism va emailni tekshiring.'; end if;
  if jsonb_typeof(p_data->'courseIds') is distinct from 'array' or jsonb_array_length(p_data->'courseIds') not between 1 and 500 then raise exception 'GRADEXA: Kamida bitta kurs tanlang.'; end if;
  select array_agg(distinct value order by value) into slugs from jsonb_array_elements_text(p_data->'courseIds');
  if exists(select 1 from unnest(slugs) s where not exists(select 1 from public.courses where slug=s and status<>'archived')) then raise exception 'GRADEXA: Kurs topilmadi yoki arxivlangan.'; end if;
  -- Serialize new invitations as well as retries for the same email.
  perform pg_advisory_xact_lock(hashtextextended('gradexa-invite:'||v_email,0));
  select * into d from public.student_invitation_drafts where id=rid for update;
  if not found then
    if p_data->>'updatedAt' is not null then raise exception 'GRADEXA: Taklif topilmadi. Ro‘yxatni yangilang.'; end if;
    if exists(select 1 from auth.users where lower(auth.users.email)=v_email) then raise exception 'GRADEXA: Bu email bilan hisob mavjud. Talabalar ro‘yxatidan uni tahrirlang.'; end if;
    insert into public.student_invitation_drafts(id,full_name,email,course_slugs,created_by)
      values(rid,v_name,v_email,slugs,p_actor) returning * into d;
  else
    if d.accepted_at is not null then raise exception 'GRADEXA: Taklif qabul qilingan. Talabalar ro‘yxatini yangilang.'; end if;
    if d.delivery_state='sending' and d.attempted_at>clock_timestamp()-interval '5 minutes' then raise exception 'GRADEXA: Taklif yuborilmoqda. Besh daqiqa ichida qayta yubormang.'; end if;
    if d.attempted_at>clock_timestamp()-interval '60 seconds' then raise exception 'GRADEXA: Qayta yuborishdan oldin bir daqiqa kuting.'; end if;
    if d.provision_token is null then
      if d.updated_at is distinct from (p_data->>'updatedAt')::timestamptz then raise exception 'GRADEXA: Qoralama o‘zgargan. Ro‘yxatni yangilang.'; end if;
      update public.student_invitation_drafts set full_name=v_name,email=v_email,course_slugs=slugs where id=rid returning * into d;
    elsif (d.full_name,d.email,d.course_slugs) is distinct from (v_name,v_email,slugs) then
      raise exception 'GRADEXA: Yuborilgan taklifni o‘zgartirib bo‘lmaydi. Ro‘yxatni yangilang.';
    end if;
  end if;
  select * into u from auth.users a where lower(a.email)=v_email;
  if found then
    if u.raw_user_meta_data->>'gradexa_invitation_id' is distinct from d.id::text
      or d.provision_token is null or u.raw_user_meta_data->>'gradexa_invitation_token' is distinct from d.provision_token::text
      or u.invited_at is null then raise exception 'GRADEXA: Bu email bilan boshqa hisob mavjud. Mavjud hisobni tahrirlang.'; end if;
    if not exists(select 1 from public.profiles where id=u.id and role='student' and status<>'paused') then raise exception 'GRADEXA: Hisob roli yoki holati taklifga mos emas.'; end if;
    if u.email_confirmed_at is not null then raise exception 'GRADEXA: Talaba emailni tasdiqlagan. Parol oynasini yakunlasin yoki login sahifasida Parolni unutdingizmi orqali tiklasin.'; end if;
  end if;
  update public.student_invitation_drafts set delivery_state='sending',provision_token=coalesce(provision_token,gen_random_uuid()),
    dispatch_claim=gen_random_uuid(),attempted_at=clock_timestamp(),updated_at=clock_timestamp()
    where id=rid returning * into d;
  return jsonb_build_object('id',d.id,'claim',d.dispatch_claim,'token',d.provision_token,'email',d.email,'name',d.full_name);
end $$;
revoke all on function public.gradexa_prepare_invitation(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.gradexa_prepare_invitation(uuid,jsonb) to service_role;

-- Shared internal binding. Metadata alone is insufficient: email, a server-issued
-- unpredictable token, Auth's invited_at, profile role and persisted draft agree.
create or replace function gradexa_private.bind_invitation(p_id uuid,p_user uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare d public.student_invitation_drafts; u auth.users; profile public.profiles;
begin
  select * into d from public.student_invitation_drafts where id=p_id for update;
  if not found then raise exception 'GRADEXA: Taklif topilmadi.'; end if;
  select * into u from auth.users where id=p_user;
  if not found or u.invited_at is null or lower(u.email) is distinct from lower(d.email)
    or d.provision_token is null or u.raw_user_meta_data->>'gradexa_invitation_id' is distinct from d.id::text
    or u.raw_user_meta_data->>'gradexa_invitation_token' is distinct from d.provision_token::text
    or (d.user_id is not null and d.user_id<>p_user) then raise exception 'GRADEXA: Taklif va hisob mos kelmadi.' using errcode='42501'; end if;
  select * into profile from public.profiles where id=p_user for update;
  if not found or profile.role<>'student' or profile.status='paused' then raise exception 'GRADEXA: Talaba profili faol emas. Administratorga murojaat qiling.' using errcode='42501'; end if;
  if p_accept and (u.email_confirmed_at is null or coalesce(u.encrypted_password,'')='') then raise exception 'GRADEXA: Emailni tasdiqlang va parol o‘rnating.' using errcode='42501'; end if;
  -- Bind once. Later resends/accept retries cannot reactivate a paused enrollment.
  if d.user_id is null then
    insert into public.enrollments(student_id,course_id,status)
      select p_user,id,'active'::public.gradexa_enrollment_status from public.courses where slug=any(d.course_slugs)
      on conflict(student_id,course_id) do nothing;
    update public.profiles set full_name=d.full_name,initials=upper(left(d.full_name,2)),status='invited' where id=p_user;
    update public.student_invitation_drafts set user_id=p_user,updated_at=clock_timestamp() where id=d.id;
  end if;
  if p_accept and d.accepted_at is null then
    update public.profiles set status='active' where id=p_user;
    update public.student_invitation_drafts set accepted_at=clock_timestamp(),updated_at=clock_timestamp() where id=d.id;
  end if;
end $$;
revoke all on function gradexa_private.bind_invitation(uuid,uuid,boolean) from public,anon,authenticated;

create or replace function public.gradexa_finish_invitation(p_id uuid,p_claim uuid,p_user uuid,p_sent boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.student_invitation_drafts; uid uuid;
begin
  select * into d from public.student_invitation_drafts where id=p_id for update;
  if not found or d.dispatch_claim is distinct from p_claim or p_claim is null then raise exception 'GRADEXA: Yuborish so‘rovi eskirgan.'; end if;
  if p_sent and p_user is null then raise exception 'GRADEXA: Taklif hisobi topilmadi.'; end if;
  -- A network timeout may occur after Auth created the account. Reconcile only
  -- that exact authorized invitation; never delete or reset an existing account.
  uid:=p_user;
  if uid is null then
    select id into uid from auth.users where lower(email)=lower(d.email)
      and raw_user_meta_data->>'gradexa_invitation_id'=d.id::text
      and raw_user_meta_data->>'gradexa_invitation_token'=d.provision_token::text and invited_at is not null;
  end if;
  if uid is not null then perform gradexa_private.bind_invitation(d.id,uid,false); end if;
  update public.student_invitation_drafts set delivery_state=case when p_sent then 'sent' else 'failed' end,
    sent_at=case when p_sent then clock_timestamp() else sent_at end,updated_at=clock_timestamp() where id=d.id;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gradexa_finish_invitation(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.gradexa_finish_invitation(uuid,uuid,uuid,boolean) to service_role;

create or replace function public.gradexa_accept_invitation()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); u auth.users; rid uuid;
begin
  if uid is null then raise exception 'GRADEXA: Kirish sessiyasi kerak.' using errcode='42501'; end if;
  select * into u from auth.users where id=uid;
  rid:=(u.raw_user_meta_data->>'gradexa_invitation_id')::uuid;
  if rid is null then raise exception 'GRADEXA: Taklif topilmadi.'; end if;
  perform gradexa_private.bind_invitation(rid,uid,true);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gradexa_accept_invitation() from public,anon;
grant execute on function public.gradexa_accept_invitation() to authenticated;

-- Keep the workspace DTO and all other existing read paths. Sent invitations
-- appear once; after acceptance the real profile replaces its invitation row.
create or replace function gradexa_private.invitation_students(p_offset integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.profiles; staff boolean; result jsonb;
begin
  select * into actor from public.profiles where id=auth.uid() and status='active';
  if not found then raise exception 'GRADEXA: Faol akkaunt bilan qayta kiring.' using errcode='42501'; end if;
  if p_offset is null or p_offset<0 then raise exception 'GRADEXA: Noto‘g‘ri sahifa.'; end if;
  staff:=actor.role in ('owner','admin');
  select coalesce(jsonb_agg(x.value order by x.id),'[]'::jsonb) into result from (
    select p.id,jsonb_build_object('id',p.id,'name',p.full_name,'email',p.email,'bio',p.bio,'status',p.status,
      'language',p.language,'avatar',p.avatar,'createdAt',p.created_at,'updatedAt',p.updated_at,'invitation',false,
      'courseIds',coalesce((select jsonb_agg(c.slug order by c.slug) from public.enrollments e join public.courses c on c.id=e.course_id where e.student_id=p.id and e.status='active'),'[]'::jsonb)) value
    from public.profiles p where p.role='student' and (staff or p.id=actor.id)
      and not (p.status='invited' and exists(select 1 from public.student_invitation_drafts d where d.user_id=p.id and d.accepted_at is null))
    union all
    select d.id,jsonb_build_object('id',d.id,'name',d.full_name,'email',d.email,'bio',d.bio,'status','invited',
      'courseIds',d.course_slugs,'createdAt',d.created_at,'updatedAt',d.updated_at,'invitation',true,'invitationState',d.delivery_state)
      || case when d.user_id is null then '{}'::jsonb else jsonb_build_object('invitationUserId',d.user_id) end
      || case when d.sent_at is null then '{}'::jsonb else jsonb_build_object('invitationSentAt',d.sent_at) end
    from public.student_invitation_drafts d where staff and d.accepted_at is null
      and ((d.user_id is null and not exists(select 1 from public.profiles p where lower(p.email)=lower(d.email)))
        or exists(select 1 from public.profiles p where p.id=d.user_id and p.status='invited'))
    order by id limit 100 offset p_offset
  ) x;
  return result;
end $$;
revoke all on function gradexa_private.invitation_students(integer) from public,anon;
grant execute on function gradexa_private.invitation_students(integer) to authenticated;
create or replace function public.gradexa_workspace_read(p_kind text,p_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$
  select case when p_kind='students' then gradexa_private.invitation_students(p_offset)
    else gradexa_private.workspace_read(p_kind,p_offset) end
$$;
revoke all on function public.gradexa_workspace_read(text,integer) from public,anon;
grant execute on function public.gradexa_workspace_read(text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
