@echo off
echo ========================================
echo Fix RLS and Restart Application
echo ========================================
echo.
echo The application is now working with Supabase!
echo However, there's a Row Level Security (RLS) issue.
echo.
echo To fix the RLS problem:
echo 1. Open the application at http://localhost:5173
echo 2. Click "RLS Manager" in the sidebar
echo 3. Click "Отключить RLS (для разработки)"
echo 4. Try creating a project again
echo.
echo Alternative: Run SQL commands manually in Supabase Dashboard
echo (see fix_rls_policies.sql file)
echo.
echo Starting development server...
npm run dev


























