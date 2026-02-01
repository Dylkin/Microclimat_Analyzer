@echo off
echo ========================================
echo Test Supabase Connection
echo ========================================
echo.
echo This script will test the connection to your Supabase database.
echo.
echo Checking if .env file exists...
if exist .env (
    echo ✓ .env file found
    echo.
    echo Reading Supabase configuration...
    for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_URL" .env') do set SUPABASE_URL=%%a
    for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_ANON_KEY" .env') do set SUPABASE_KEY=%%a
    echo.
    echo Supabase URL: %SUPABASE_URL%
    echo Supabase Key: %SUPABASE_KEY:~0,20%...
    echo.
    echo Starting development server to test connection...
    echo If the connection is successful, you should see no Supabase errors.
    echo.
    npm run dev
) else (
    echo ✗ .env file not found
    echo.
    echo Please run setup_supabase.bat first to configure your Supabase connection.
    echo.
    pause
)


























