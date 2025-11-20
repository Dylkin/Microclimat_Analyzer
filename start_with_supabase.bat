@echo off
echo ========================================
echo Start with Supabase Connection
echo ========================================
echo.
echo This script will start the development server with Supabase support.
echo.
echo Checking for .env file...
if exist .env (
    echo ✓ .env file found
    echo.
    echo Reading Supabase configuration...
    for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_URL" .env') do set SUPABASE_URL=%%a
    for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_ANON_KEY" .env') do set SUPABASE_KEY=%%a
    
    if "%SUPABASE_URL%"=="your_supabase_url_here" (
        echo ⚠ Supabase not configured yet
        echo.
        echo Please run one of these scripts first:
        echo - quick_supabase_setup.bat (for quick setup)
        echo - setup_supabase.bat (for guided setup)
        echo.
        pause
        exit /b 1
    )
    
    echo ✓ Supabase configured
    echo URL: %SUPABASE_URL%
    echo Key: %SUPABASE_KEY:~0,20%...
    echo.
    echo Starting development server...
    echo.
    echo The application will be available at: http://localhost:5173
    echo You can test the Supabase connection by clicking "Тест Supabase" in the sidebar.
    echo.
    npm run dev
) else (
    echo ✗ .env file not found
    echo.
    echo Please run one of these scripts first:
    echo - quick_supabase_setup.bat (for quick setup)
    echo - setup_supabase.bat (for guided setup)
    echo.
    pause
)


























