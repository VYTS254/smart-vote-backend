@echo off
title SmartVote Backend Server
color 0A

echo ========================================
echo     SmartVote Backend Server
echo ========================================
echo.
echo Starting server on port 3000...
echo.

cd /d "%~dp0"
node dist/server.js

pause
