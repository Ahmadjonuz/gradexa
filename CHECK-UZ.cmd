@echo off
setlocal
cd /d "%~dp0"
title Gradexa V2 - Tekshirish
echo Avval ishlab turgan Gradexa serverini Ctrl+C bilan toxtating.
pause
where npm.cmd >nul 2>&1
if errorlevel 1 goto failed
if not exist "node_modules\next\package.json" goto failed
node scripts\windows-setup.cjs --live
if errorlevel 1 goto failed
call npm.cmd run build:next
if errorlevel 1 goto failed
call npm.cmd run typecheck
if errorlevel 1 goto failed
call npm.cmd run test:next
if errorlevel 1 goto failed
echo.
echo Build, TypeScript va avtomatik testlar otdi.
echo Supabase va brauzerdagi amallar alohida tekshiriladi.
pause
exit /b 0

:failed
echo.
echo Tekshiruv yakunlanmadi. Yuqoridagi xato matnini tekshiring.
echo Kutubxonalar yoq bolsa, avval INSTALL-UZ.cmd faylini oching.
pause
exit /b 1
