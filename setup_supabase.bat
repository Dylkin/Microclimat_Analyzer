@echo off
echo ========================================
echo Setup Supabase Connection
echo ========================================
echo.
echo This script will help you connect to your Supabase database.
echo.
echo To get your Supabase credentials:
echo 1. Go to https://supabase.com/dashboard
echo 2. Select your project
echo 3. Go to Settings ^> API
echo 4. Copy the following values:
echo    - Project URL
echo    - anon/public key
echo.
echo After getting the credentials, we'll create the .env file.
echo.
set /p supabase_url="Enter your Supabase Project URL: "
set /p supabase_key="Enter your Supabase anon/public key: "
echo.
echo Creating .env file...
echo # Supabase Configuration > .env
echo VITE_SUPABASE_URL=%supabase_url% >> .env
echo VITE_SUPABASE_ANON_KEY=%supabase_key% >> .env
echo. >> .env
echo # Development Configuration >> .env
echo VITE_APP_ENV=development >> .env
echo VITE_APP_NAME=Microclimat Analyzer >> .env
echo.
echo .env file created successfully!
echo.
echo Testing connection...
echo.
echo Starting development server to test the connection...
npm run dev


























