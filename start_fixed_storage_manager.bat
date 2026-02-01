@echo off
echo ========================================
echo Start with Fixed Storage RLS Manager
echo ========================================
echo.
echo ✅ Import Error Fixed:
echo - Removed incorrect database.ts import
echo - Added proper Supabase client creation
echo - Fixed module export issue
echo - All functions updated to use getSupabaseClient()
echo.
echo 🔧 StorageRLSManager Ready:
echo - Proper Supabase client initialization
echo - Dynamic import of @supabase/supabase-js
echo - Environment variable validation
echo - Error handling for missing credentials
echo.
echo 🎯 To Fix Document Upload Error:
echo 1. Go to "Storage RLS Manager" in menu
echo 2. Click "Check Storage" to verify bucket
echo 3. Click "Create Bucket" if needed
echo 4. Click "Disable RLS" temporarily
echo 5. Click "Create Policies" for proper access
echo 6. Click "Enable RLS" to secure again
echo.
echo 📄 Alternative: Run fix_storage_rls.sql in Supabase SQL Editor
echo.
echo Starting development server...
npm run dev


























