@echo off
echo ========================================
echo EMERGENCY RLS FIX
echo ========================================
echo.
echo The projects table still has RLS enabled!
echo This is blocking project creation.
echo.
echo IMMEDIATE ACTION REQUIRED:
echo.
echo 1. Open Supabase Dashboard: https://supabase.com/dashboard
echo 2. Go to SQL Editor
echo 3. Copy and paste ALL the contents of emergency_rls_fix.sql
echo 4. Run the SQL commands
echo 5. Try creating a project again
echo.
echo The SQL file contains commands to:
echo - Force disable RLS for projects table
echo - Remove all existing policies
echo - Create permissive policies if needed
echo - Fix all related tables
echo - Create missing equipment table
echo.
echo Opening the emergency SQL file...
notepad emergency_rls_fix.sql
echo.
echo After running the SQL commands, press any key to start the server...
pause
echo.
echo Starting development server...
npm run dev


























