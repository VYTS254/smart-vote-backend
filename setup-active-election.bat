@echo off
title Setup Active Election for SmartVote
color 0A

echo ========================================
echo   Setup Active Election - SmartVote
echo ========================================
echo.
echo This will create:
echo - Active election (OPEN status)
echo - 3 candidates for President
echo - Voter eligibility for all users
echo.

pause

echo.
echo Running seed...
echo.

npx ts-node prisma/seed-active-election.ts

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SUCCESS! Election Created
    echo ========================================
    echo.
    echo Election: Student Council Elections 2026
    echo Status: OPEN
    echo Position: President
    echo Candidates: 3
    echo.
    echo Test Users (password: password123):
    echo - CS/2021/001 (Amina Wanjiru)
    echo - CS/2021/002 (Brian Otieno)
    echo - CS/2021/003 (Caroline Njeri)
    echo.
    echo Users can now login and vote!
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR! Seed Failed
    echo ========================================
    echo.
    echo Make sure:
    echo 1. Database is connected
    echo 2. Main seed was run first
    echo 3. Prisma is generated
    echo.
)

pause
