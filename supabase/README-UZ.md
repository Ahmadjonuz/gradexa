# Gradexa — Supabase sozlamalari

## Mavjud Gradexa loyihasi

Windows papkasini boshqa kompyuterga ko‘chirish Supabase bazasini ko‘chirishni talab qilmaydi. `.env.local`ga aynan oldingi ishlagan Supabase loyihangizning quyidagi qiymatlarini kiriting:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` faqat serverda ishlaydi va admin orqali talaba taklif qilish uchun kerak. Uni `NEXT_PUBLIC_` nomi bilan saqlamang, brauzer kodiga qo‘shmang va chatga yubormang.

Shu bazada data va invitations SQLlari allaqachon bajarilgan bo‘lsa, yangi kompyuterda qayta Run qilish shart emas. Baza eski bo‘lsa mavjud Supabase SQL Editor’da quyidagilarni tartib bilan bajaring:

1. Loyiha ildizidagi `GRADEXA-DATA-UPDATE.sql`.
2. Loyiha ildizidagi `GRADEXA-INVITATIONS-UPDATE.sql`.

Mavjud bazada `202609100001_gradexa_foundation.sql`ni qayta bajarmang. Yangilanishlar mavjud jadvallarni o‘chirmaydi va RLSni o‘chirib qo‘ymaydi.

Talaba taklifi uchun Authentication URL Configuration, Invite user email shabloni va Custom SMTPni `GRADEXA-INVITATIONS-UZ.txt` bo‘yicha sozlang. Tayyor HTML `GRADEXA-INVITE-EMAIL.html`da.

## Mutlaqo yangi Supabase loyihasi

Faqat yangi, bo‘sh Supabase loyiha yaratilgan bo‘lsa:

1. `migrations/202609100001_gradexa_foundation.sql`ni bir marta bajaring.
2. `GRADEXA-DATA-UPDATE.sql`ni bajaring.
3. `GRADEXA-INVITATIONS-UPDATE.sql`ni bajaring.
4. Auth foydalanuvchisini yarating va `bootstrap-owner.sql` yordamida o‘sha profilni owner qiling. SQL ichidagi emailni o‘zingizning owner emailingizga mahalliy almashtiring.
5. `.env.local` va Authentication redirect sozlamalarini kiriting.
6. Custom SMTP va Invite user shablonini sozlang.

## Jadvallar va xavfsizlik

Asosiy jadvallar: `profiles`, `courses`, `lessons`, `enrollments`, `lesson_progress`, `quizzes`, `quiz_questions`, `quiz_attempts`, `workspace_settings`, `quick_tasks`, `student_invitation_drafts`.

Rollar `profiles` jadvalida `owner`, `admin`, `student` sifatida saqlanadi. Client yuborgan rolga ishonilmaydi. Oddiy o‘quv ma’lumotlari tekshirilgan RPC/RLS orqali o‘qiladi va yoziladi. Taklif yuboruvchi RPC faqat server secret client uchun, taklifni qabul qilish esa foydalanuvchining o‘z tasdiqlangan sessiyasi uchun ochilgan.

Server secret key orqali Supabase Dashboarddan tashqarida hech qanday SQL avtomatik bajarilmaydi. SQL o‘zgarishlarini o‘zingiz mavjud loyihaning SQL Editor oynasida ko‘rib Run qilasiz.
