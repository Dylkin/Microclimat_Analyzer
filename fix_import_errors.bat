@echo off
echo ========================================
echo Fix Import Errors
echo ========================================
echo.
echo Fixed the SupabaseConnectionTest import error.
echo Now restarting the development server...
echo.
echo Stopping any running processes...
taskkill /f /im node.exe 2>nul
echo.
echo Starting development server...
echo Server will be available at: http://localhost:5173
echo.
npm run dev


























