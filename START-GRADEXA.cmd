@echo off
setlocal
cd /d "%~dp0"
title Gradexa V2
where node.exe >nul 2>&1
if errorlevel 1 goto install_first
where npm.cmd >nul 2>&1
if errorlevel 1 goto install_first
if not exist "node_modules\next\package.json" goto install_first
if not exist ".gradexa-installed" goto install_first
node scripts\windows-setup.cjs --check
if errorlevel 1 goto config_error
echo.
echo Brauzerda http://localhost:3000/login manzilini oching.
echo Port band bolsa, terminalda korsatilgan manzildan foydalaning.
echo Ushbu oynani ochiq qoldiring. Toxtatish: Ctrl+C.
call npm.cmd run dev:next
if errorlevel 1 goto failed
exit /b 0

:install_first
echo Avval INSTALL-UZ.cmd faylini ishga tushiring.
pause
exit /b 1

:config_error
echo .env.local sozlamalarini tekshiring. Yoriqnoma: BOSHLASH-UZ.txt
pause
exit /b 1

:failed
echo Server xato bilan toxtadi. Yuqoridagi xato matnini tekshiring.
pause
exit /b 1
