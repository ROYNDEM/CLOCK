@echo off
title CHRONOS Desktop App
echo ========================================================
echo   CHRONOS - Board Meeting Dual Clock ^& Alarms
echo   Starting Desktop App with Native Always-On-Top Popups...
echo ========================================================
echo.
cd /d "%~dp0"
call npx electron .
if %errorlevel% neq 0 (
    echo.
    echo Electron launch attempt via npm...
    npm run app
)
pause
