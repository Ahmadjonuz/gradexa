@echo off
setlocal
cd /d "%~dp0"
title Gradexa V2 - Bank proksi orqali toliq ornatish

where node.exe >nul 2>&1
if errorlevel 1 goto node_missing
node scripts\windows-setup.cjs --bank-node
if errorlevel 1 goto node_old

set "HTTP_PROXY=http://172.23.11.101:2002"
set "HTTPS_PROXY=http://172.23.11.101:2002"
set "NO_PROXY=localhost,127.0.0.1"
set "NODE_USE_ENV_PROXY=1"
set "NODE_OPTIONS=--use-system-ca --use-env-proxy"

echo Bank proksisi faqat shu ornatish oynasi uchun ulandi:
echo 172.23.11.101:2002
echo.
call "%~dp0INSTALL-UZ.cmd"
exit /b %errorlevel%

:node_missing
echo Node.js topilmadi. Bank IT xodimi orqali Node.js LTS ornating.
pause
exit /b 1

:node_old
echo Node.js versiyasi bank proksi rejimi uchun eski.
echo Node.js 22.21 yoki yangiroq 22.x, yoxud 24.5 yoki yangiroq LTS kerak.
pause
exit /b 1
