@echo off
echo ========================================
echo Fix Export Errors
echo ========================================
echo.
echo Fixed the testingPeriodService export issue.
echo Now restarting the development server...
echo.
echo Stopping any running processes...
taskkill /f /im node.exe 2>nul
echo.
echo Starting development server...
npm run dev

