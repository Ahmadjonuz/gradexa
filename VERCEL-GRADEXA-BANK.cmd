@echo off
setlocal
cd /d "%~dp0"
title Gradexa V2 - Vercel bank proksi terminali

where node.exe >nul 2>&1
if errorlevel 1 goto node_missing
node scripts\windows-setup.cjs --bank-node
if errorlevel 1 goto node_old

set "HTTP_PROXY=http://172.23.11.101:2002"
set "HTTPS_PROXY=http://172.23.11.101:2002"
set "NO_PROXY=localhost,127.0.0.1"
set "NODE_USE_ENV_PROXY=1"
set "NODE_OPTIONS=--use-system-ca --use-env-proxy"

echo.
echo Gradexa papkasida Vercel uchun bank proksi terminali ochildi.
echo Proksi faqat shu oynada ishlaydi: 172.23.11.101:2002
echo Maxfiy kalitlarni buyruqqa yozmang; Vercel Dashboard orqali kiriting.
echo.
echo Birinchi ulash:
echo   npx.cmd --yes vercel@latest login
echo   npx.cmd --yes vercel@latest link
echo.
echo Production joylash:
echo   npx.cmd --yes vercel@latest deploy --prod --logs
echo.
cmd /k
exit /b 0

:node_missing
echo Node.js topilmadi. Oldin Gradexa ishlagan Node.js LTS kerak.
pause
exit /b 1

:node_old
echo Node.js versiyasi bank proksi rejimi uchun eski.
echo Node.js 22.21+ yoki 24.5+ LTS kerak.
pause
exit /b 1
