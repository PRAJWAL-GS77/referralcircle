@echo off
setlocal enabledelayedexpansion

:: 1. Navigate to script's directory so it works when double-clicked
cd /d "%~dp0"

set "ZIP_NAME=referralcircle-slim.zip"
set "ZIP_PATH=%~dp0..\%ZIP_NAME%"

echo ========================================================
echo WARNING: Ensuring no real secrets (.env) are included.
echo ========================================================

:: 2. Delete any older copy first
if exist "%ZIP_PATH%" del /f /q "%ZIP_PATH%"

:: 3 & 4. Archive using built-in Windows tar with excludes
tar -a -c -f "%ZIP_PATH%" ^
  --exclude="node_modules" ^
  --exclude=".git" ^
  --exclude="dist" ^
  --exclude="build" ^
  --exclude="coverage" ^
  --exclude=".vite" ^
  --exclude=".env" ^
  --exclude=".env.local" ^
  --exclude=".env.production" ^
  --exclude="*.log" ^
  --exclude="package-lock.json" ^
  *

if not exist "%ZIP_PATH%" (
    echo [ERROR] Failed to generate zip file.
    pause
    exit /b 1
)

:: 6. Get full path and calculate size in MB
for %%F in ("%ZIP_PATH%") do (
    set "FILE_SIZE=%%~zF"
    set "FULL_PATH=%%~fF"
)

for /f "usebackq tokens=*" %%A in (`powershell -NoProfile -Command "[math]::Round(%FILE_SIZE% / 1MB, 2)"`) do set "SIZE_MB=%%A"

echo.
echo ========================================================
echo Zip created: %FULL_PATH%
echo Size: %SIZE_MB% MB
echo.
echo Upload this file to Claude
echo ========================================================
echo.
pause
