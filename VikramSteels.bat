@echo off
if "%1"=="hide" (
    start /min "" "%~dp0VikramSteels.exe"
    exit
)
start /min "" "%~f0" hide
exit
