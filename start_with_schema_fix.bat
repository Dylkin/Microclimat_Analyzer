@echo off
echo ========================================
echo Start with Storage Schema Fix
echo ========================================
echo.
echo ✅ Schema Error Fixed:
echo - Fixed storage.buckets table access
echo - Updated to use RPC exec method
echo - Added fallback error handling
echo - Added alternative SQL instructions
echo.
echo 🔧 StorageRLSManager Updated:
echo - Proper schema access via RPC
echo - Error handling for RPC failures
echo - User guidance for manual setup
echo - Alternative SQL script provided
echo.
echo 🎯 To Fix Document Upload Error:
echo.
echo Method 1 - Using UI:
echo 1. Go to "Storage RLS Manager" in menu
echo 2. Try "Check Storage" (may show RPC error)
echo 3. Click "Create Bucket" to create bucket
echo 4. Click "Disable RLS" temporarily
echo 5. Click "Create Policies" for access
echo 6. Click "Enable RLS" to secure
echo.
echo Method 2 - Using SQL (Recommended):
echo 1. Open Supabase Dashboard
echo 2. Go to SQL Editor
echo 3. Run contents of simple_storage_fix.sql
echo 4. Test document upload
echo.
echo 📄 Files available:
echo - simple_storage_fix.sql (recommended)
echo - fix_storage_rls.sql (detailed)
echo.
echo Starting development server...
npm run dev


























