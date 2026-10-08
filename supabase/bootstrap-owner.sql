-- 1. Quyidagi emailni Supabase Authentication bo‘limidagi o‘z emailingizga almashtiring.
-- 2. Keyin bu faylni SQL Editor orqali bir marta ishga tushiring.

do $$
declare
  owner_email text := 'YOUR_EMAIL@example.com';
  owner_id uuid;
begin
  if owner_email = 'YOUR_EMAIL@example.com' then
    raise exception 'Avval YOUR_EMAIL@example.com o‘rniga haqiqiy emailingizni yozing.';
  end if;

  select id into owner_id
  from auth.users
  where lower(email) = lower(owner_email);

  if owner_id is null then
    raise exception 'Authentication bo‘limida % emailiga tegishli foydalanuvchi topilmadi.', owner_email;
  end if;

  update public.profiles
  set full_name = 'Ahmadjon Karimov',
      initials = 'AK',
      role = 'owner',
      status = 'active'
  where id = owner_id;

  if not found then
    raise exception 'Profiles jadvalida owner profili topilmadi.';
  end if;
end;
$$;

