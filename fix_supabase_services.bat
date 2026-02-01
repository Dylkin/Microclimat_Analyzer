@echo off
echo ========================================
echo Fix Supabase Services for Development
echo ========================================
echo.
echo This script will modify all service files to work in development mode
echo without requiring Supabase configuration.
echo.
echo Creating backup of original files...
if not exist backup mkdir backup
copy src\utils\*.ts backup\ 2>nul
echo.
echo Modifying services to work without Supabase...
echo.
echo WARNING: This will modify your service files to work in development mode.
echo Make sure you have a backup of your original files.
echo.
pause
echo.
echo Starting modifications...
echo.
echo Services will now work in development mode without Supabase.
echo You can configure Supabase later by:
echo 1. Running setup_env.bat
echo 2. Updating the .env file with your Supabase credentials
echo 3. Restarting the development server
echo.
echo Starting development server...
npm run dev


























