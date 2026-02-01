@echo off
echo ========================================
echo Fix Supabase RLS Policies
echo ========================================
echo.
echo The error you're seeing is due to Row Level Security (RLS) policies
echo in your Supabase database that are blocking project creation.
echo.
echo To fix this issue, you need to run SQL commands in your Supabase dashboard:
echo.
echo 1. Go to https://supabase.com/dashboard
echo 2. Select your project
echo 3. Go to SQL Editor
echo 4. Copy and paste the contents of fix_rls_policies.sql
echo 5. Run the SQL commands
echo.
echo The SQL file contains commands to either:
echo - Disable RLS temporarily (for development)
echo - Create permissive policies (for production)
echo.
echo After running the SQL commands, try creating a project again.
echo.
echo Opening the SQL file for you to copy...
notepad fix_rls_policies.sql
echo.
echo After running the SQL commands in Supabase, press any key to continue...
pause
echo.
echo Starting development server...
npm run dev


























