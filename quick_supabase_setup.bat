@echo off
echo ========================================
echo Quick Supabase Setup
echo ========================================
echo.
echo Creating .env file with example values...
echo You can edit this file later with your actual Supabase credentials.
echo.
echo # Supabase Configuration > .env
echo VITE_SUPABASE_URL=https://your-project-id.supabase.co >> .env
echo VITE_SUPABASE_ANON_KEY=your-anon-key-here >> .env
echo. >> .env
echo # Development Configuration >> .env
echo VITE_APP_ENV=development >> .env
echo VITE_APP_NAME=Microclimat Analyzer >> .env
echo.
echo .env file created with example values!
echo.
echo IMPORTANT: You need to replace the example values with your actual Supabase credentials:
echo.
echo 1. Go to https://supabase.com/dashboard
echo 2. Select your project
echo 3. Go to Settings ^> API
echo 4. Copy your Project URL and replace 'https://your-project-id.supabase.co'
echo 5. Copy your anon/public key and replace 'your-anon-key-here'
echo.
echo After updating the .env file, run test_supabase_connection.bat to test the connection.
echo.
echo Opening .env file for editing...
notepad .env
echo.
echo After saving the .env file, press any key to test the connection...
pause
echo.
echo Testing connection...
npm run dev


























