@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Port Cleanup Utility
echo ========================================
echo.

REM Check if a port number was provided as argument
if "%1"=="" (
    set PORT=3000
    echo No port specified, using default port 3000
) else (
    set PORT=%1
    echo Using specified port %PORT%
)

echo.
echo Searching for processes using port %PORT%...

REM Method 1: Find processes using the specific port
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    set FOUND=1
    echo Found process using port %PORT%: PID %%a
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! EQU 0 (
        echo ✅ Successfully killed process %%a
    ) else (
        echo ❌ Failed to kill process %%a
    )
)

if !FOUND! EQU 0 (
    echo ℹ️  No processes found using port %PORT%
)

echo.
echo ========================================
echo Cleaning up Node.js related processes...
echo ========================================

REM Kill all node.exe processes
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% EQU 0 (
    echo ✅ Killed Node.js processes
) else (
    echo ℹ️  No Node.js processes found
)

REM Kill nodemon processes
taskkill /F /IM nodemon.exe >nul 2>&1
if %errorlevel% EQU 0 (
    echo ✅ Killed nodemon processes
) else (
    echo ℹ️  No nodemon processes found
)

REM Kill npm processes that might be hanging
taskkill /F /IM npm.cmd >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1

echo.
echo ========================================
echo Port %PORT% cleanup completed!
echo ========================================
echo.
echo You can now run your server:
echo   npm start
echo   or
echo   node server.js
echo.

REM Wait for 2 seconds before closing
timeout /t 2 >nul
