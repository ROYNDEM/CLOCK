@echo off
title CHRONOS Board Meeting Clock Server
echo ========================================================
echo   CHRONOS - Board Meeting Dual Clock ^& Alarms
echo   Starting local server for full desktop popup support...
echo ========================================================
echo.
echo Launching http://localhost:8080 in your browser...
echo (Keep this window minimized in background during your meeting)
echo.

node server.js
if %errorlevel% neq 0 (
    echo Node failed, attempting python http.server...
    start "" "http://localhost:8080"
    python -m http.server 8080
)
pause
