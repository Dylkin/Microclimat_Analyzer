@echo off
echo ========================================
echo Start with Storage RLS Fix
echo ========================================
echo.
echo ✅ Storage RLS Manager Ready:
echo.
echo 🔧 Components Added:
echo - StorageRLSManager component
echo - Navigation menu item
echo - SQL script for manual setup
echo - Automatic fix scripts
echo.
echo 🎯 To Fix Document Upload Error:
echo.
echo Method 1 - Using UI:
echo 1. Go to "Storage RLS Manager" in menu
echo 2. Click "Check Storage" 
echo 3. Click "Create Bucket" (if needed)
echo 4. Click "Disable RLS" (temporarily)
echo 5. Click "Create Policies" 
echo 6. Click "Enable RLS"
echo.
echo Method 2 - Using SQL:
echo 1. Open Supabase Dashboard
echo 2. Go to SQL Editor
echo 3. Run fix_storage_rls.sql
echo.
echo 📄 Expected Result:
echo - Document upload works without permission errors
echo - Users can upload PDF, DOC, DOCX files
echo - Proper RLS policies protect storage
echo.
echo Starting development server...
npm run dev


























