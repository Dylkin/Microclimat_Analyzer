@echo off
echo ========================================
echo QUICK FIX FOR RLS ISSUE
echo ========================================
echo.
echo URGENT: RLS is still blocking project creation!
echo.
echo SOLUTION:
echo 1. Open emergency_rls_fix.sql
echo 2. Copy ALL content
echo 3. Go to Supabase Dashboard → SQL Editor
echo 4. Paste and run the SQL commands
echo 5. Try creating a project again
echo.
echo Opening the emergency SQL file...
notepad emergency_rls_fix.sql
echo.
echo After running SQL commands, press any key to start server...
pause
npm run dev


























