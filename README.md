# Gradexa V2

Gradexa V2 ning 2026-10-06 holatidagi to‘liq manba kodi. Windowsda boshlash uchun `BOSHLASH-UZ.txt`ni o‘qing.

## Windows

1. ZIPni to‘liq chiqaring va `gradexa` papkasini Desktopga qo‘ying.
2. Oddiy internetda `INSTALL-UZ.cmd`, bank tarmog‘ida `INSTALL-GRADEXA-BANK.cmd`ni oching.
3. Yaratilgan `.env.local`ga mavjud Supabase loyihangizning to‘rtta qiymatini kiriting: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SECRET_KEY`.
4. Oddiy rejimda `START-GRADEXA.cmd`, bank tarmog‘ida `START-GRADEXA-BANK.cmd`ni oching.
5. `http://localhost:3000/login` manziliga kiring.

Bank launcherlari `172.23.11.101:2002` proksisini faqat o‘z terminal jarayonida qo‘llaydi. Node.js kamida 22.13; bank rejimida 22.21+ yoki 24.5+ kerak.

`node_modules`, `.next` va `.env.local` ZIPga kiritilmagan. Aniq bog‘liqliklar `package-lock.json`da, installer `npm.cmd ci` orqali ularni o‘rnatadi. Maxfiy server kalitiga `NEXT_PUBLIC_` prefiksini qo‘shmang va uni chatga yubormang.

## Hozirgi ma’lumotlar qatlami

| Qism | Saqlash |
| --- | --- |
| Login, logout, callback va parol | Supabase Auth |
| Rollar va profillar | `profiles` |
| Kurslar va yozilishlar | `courses`, `enrollments` |
| Darslar va progress | `lessons`, `lesson_progress` |
| Testlar va savollar | `quizzes`, `quiz_questions` |
| Urinishlar va natijalar | `quiz_attempts` |
| Sozlamalar va vazifalar | `workspace_settings`, `quick_tasks` |
| Talaba takliflari | `student_invitation_drafts` + Supabase Auth |

`localStorage` faqat eski Gradexa yozuvlarini ko‘chirish va oynalar orasidagi yangilanish signali uchun saqlangan. Yangi o‘quv ma’lumotlari Supabase orqali o‘qiladi va yoziladi.

Brauzer localStorage yozuvlari ZIP ichiga kirmaydi. Supabase yozuvlari esa Windows papkasidan alohida, Supabase loyihangizda qoladi. Boshqa kompyuterda aynan o‘sha loyiha sozlamalarini kiritsangiz mavjud ma’lumotlar qayta ko‘rinadi.

## Supabase yangilanishlari

Mavjud Gradexa bazasida oldingi SQLlar bajarilgan bo‘lsa, kompyuterni almashtirganda ularni takror bajarish shart emas.

Eski baza uchun tartib:

1. `GRADEXA-DATA-UPDATE.sql`
2. `GRADEXA-INVITATIONS-UPDATE.sql`

Mutlaqo yangi Supabase loyihasi uchun `supabase/README-UZ.md`ni o‘qing. Mavjud bazada foundation faylini qayta bajarmang.

Haqiqiy talaba taklifi uchun `GRADEXA-INVITATIONS-UZ.txt`dagi Auth URL, Invite user shabloni va Custom SMTP sozlamalari kerak. Tayyor shablon: `GRADEXA-INVITE-EMAIL.html`.

## Tuzilma

- `app/`: App Router sahifalari, auth callback va layoutlar.
- `components/`: UI, logo va navigatsiya.
- `features/courses`, `features/lessons`, `features/enrollments`: kurs va dars qatlami.
- `features/workspace`: admin/student sahifalari, testlar, natijalar va profil.
- `features/invitations`: serverdagi haqiqiy taklif va parol faollashuvi.
- `lib/supabase`: client, server, proxy va admin client.
- `supabase/migrations`: sxema, funksiyalar va RLS migratsiyalari.
- `public`: rasmlar va brend resurslari.
- `tests`: adapter, biznes qoidalari va integratsiya testlari.

## Tekshirish

```powershell
npm.cmd run typecheck
npm.cmd run test:next
npm.cmd run build:next
```

Yoki serverni to‘xtatib `CHECK-UZ.cmd`ni oching. Joriy paketda typecheck, 62 ta dastur testi, production build va 19 ta alohida PostgreSQL integratsiya testi o‘tgan. SMTP yetkazilishi va email callback oqimi sizning Supabase/Windows muhitingizda amaliy tekshiriladi.

Next.js 16.2.6, React 19.2.6, TypeScript 5.9.3, Tailwind CSS 4, Supabase JS/SSR, Zod, Recharts, Lucide va mavjud shadcn/Radix komponentlari ishlatiladi.
