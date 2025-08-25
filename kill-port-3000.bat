@echo off
echo Killing processes using port 3000...

REM Find and kill processes using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process ID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! EQU 0 (
        echo Successfully killed process %%a
    ) else (
        echo Failed to kill process %%a or process not found
    )
)

REM Alternative method - kill all node.exe processes
echo.
echo Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% EQU 0 (
    echo Successfully killed all Node.js processes
) else (
    echo No Node.js processes found or failed to kill
)

REM Also kill any nodemon processes
echo.
echo Killing any nodemon processes...
taskkill /F /IM nodemon.exe >nul 2>&1
if %errorlevel% EQU 0 (
    echo Successfully killed nodemon processes
) else (
    echo No nodemon processes found
)

echo.
echo Port 3000 cleanup completed!
echo You can now run "npm start" to start the server.
echo.
pause
