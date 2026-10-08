@echo off
setlocal
cd /d "%~dp0"
title Gradexa V2 - Toliq ornatish
if exist ".gradexa-installed" del /q ".gradexa-installed" >nul 2>&1

echo ============================================================
echo GRADEXA V2 - TOLIQ ORNATISH
echo ============================================================
echo Bu jarayon Node.js, kutubxonalar, Supabase, build va testlarni tekshiradi.
echo Internet aloqasi va Node.js 22.13 yoki yangiroq versiya kerak.
echo.

where node.exe >nul 2>&1
if errorlevel 1 goto node_missing
where npm.cmd >nul 2>&1
if errorlevel 1 goto node_missing
node scripts\windows-setup.cjs --node
if errorlevel 1 goto failed

echo.
echo [1/6] Kutubxonalar ornatilmoqda...
call npm.cmd ci
if errorlevel 1 goto failed

echo.
echo [2/6] Mahalliy sozlamalar tayyorlanmoqda...
node scripts\windows-setup.cjs --prepare
if errorlevel 1 goto failed
node scripts\windows-setup.cjs --check
if not errorlevel 1 goto live_check

:configure
echo.
echo .env.local ochiladi. Supabase Project URL, publishable key va server secret keyni kiriting.
echo NEXT_PUBLIC_SITE_URL=http://localhost:3000 holida qolsin.
echo Faylni Ctrl+S bilan saqlab, Notepadni yoping.
echo Qiymatlarni chatga yubormang.
start /wait "" notepad.exe "%~dp0.env.local"
node scripts\windows-setup.cjs --check
if errorlevel 1 goto config_failed

:live_check
echo.
echo [3/6] Supabase Auth, sozlamalar va courses jadvali tekshirilmoqda...
node scripts\windows-setup.cjs --live
if errorlevel 5 goto courses_missing
if errorlevel 4 goto courses_update
if errorlevel 1 goto connection_failed
goto verify_build

:courses_update
echo.
echo Kurslar SQL yangilanishi kerak. Supabase SQL Editor va SQL fayli ochiladi.
echo SQL matnini SQL Editorga kochiring, Run bosing va xatosiz tugashini kuting.
start "" "https://supabase.com/dashboard/projects"
start /wait "" notepad.exe "%~dp001-SUPABASE-KURSLAR.sql"
echo SQL Editor ichida Run tugagach shu oynaga qayting.
pause
node scripts\windows-setup.cjs --live
if errorlevel 1 goto database_failed
goto verify_build

:verify_build
echo.
echo [4/6] Production build tekshirilmoqda...
call npm.cmd run build:next
if errorlevel 1 goto failed

echo.
echo [5/6] TypeScript tekshirilmoqda...
call npm.cmd run typecheck
if errorlevel 1 goto failed

echo.
echo [6/6] Avtomatik testlar bajarilmoqda...
call npm.cmd run test:next
if errorlevel 1 goto failed
node scripts\windows-setup.cjs --mark-installed
if errorlevel 1 goto failed

echo.
echo ============================================================
echo TOLIQ ORNATISH MUVAFFAQIYATLI TUGADI
echo ============================================================
echo Endi START-GRADEXA.cmd faylini ikki marta bosing.
pause
exit /b 0

:node_missing
echo.
echo Node.js yoki npm topilmadi.
echo Node.js 22.13 yoki yangiroq LTS versiyani ornating va INSTALL-UZ.cmdni qayta oching.
pause
exit /b 1

:config_failed
echo.
echo .env.local toldirilmagan yoki manzil formati xato.
echo Faylni tuzatib, INSTALL-UZ.cmdni qayta oching. Mavjud qiymatlar saqlanadi.
pause
exit /b 1

:connection_failed
echo.
echo Supabasega ulanish tekshiruvi otmadi.
echo Internet, Project URL va publishable keyni tekshirib INSTALL-UZ.cmdni qayta oching.
pause
exit /b 1

:courses_missing
echo.
echo Tanlangan Supabase loyihasida courses jadvali topilmadi.
echo Agar oldingi Gradexa bazangiz bor bolsa, .env.localda aynan osha loyiha URL/keyini kiriting.
echo Yangi bosh baza kerak bolsa, supabase\README-UZ.md dagi tartibni bajaring.
start "" notepad.exe "%~dp0supabase\README-UZ.md"
pause
exit /b 1

:database_failed
echo.
echo Kurslar SQLi hali tayyor emas yoki RLS/grant tekshiruvi otmadi.
echo Supabase SQL Editor natijasini tekshiring, song INSTALL-UZ.cmdni qayta oching.
pause
exit /b 1

:failed
echo.
echo Toliq ornatish yakunlanmadi. Yuqoridagi birinchi xato matnini tekshiring.
echo Tuzatgandan keyin INSTALL-UZ.cmdni qayta ochish xavfsiz.
pause
exit /b 1
