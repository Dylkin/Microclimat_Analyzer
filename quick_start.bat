@echo off
echo ========================================
echo Quick Start - Development Mode
echo ========================================
echo.
echo Starting Microclimat Analyzer in development mode...
echo.
echo Setting development environment variables...
set VITE_SUPABASE_URL=http://localhost:54321
set VITE_SUPABASE_ANON_KEY=dev_key_placeholder
set VITE_APP_ENV=development
set VITE_APP_NAME=Microclimat Analyzer
echo.
echo Starting development server...
echo Server will be available at: http://localhost:5173
echo.
echo Note: Some features requiring Supabase will be disabled in development mode.
echo To enable full functionality, configure Supabase using setup_env.bat
echo.
npm run dev


























