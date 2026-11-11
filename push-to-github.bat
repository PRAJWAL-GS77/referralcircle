@echo off
cd /d "%~dp0"
echo ========================================================
echo      Pushing ReferralCircle to GitHub
echo      Repository: https://github.com/PRAJWAL-GS77/referralcircle.git
echo ========================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   Push successful! Code is live on GitHub.
    echo ========================================================
) else (
    echo ========================================================
    echo   Push encountered an error. Please check messages above.
    echo ========================================================
)
echo.
pause
