@echo off
echo ========================================
echo Fix Document Type Enum Error
echo ========================================
echo.
echo ❌ Error Found:
echo - Invalid input value for enum document_type: "qualification_protocol"
echo - The enum type in database doesn't include this value
echo.
echo 🔧 Solution:
echo - Add "qualification_protocol" to document_type enum
echo - Execute SQL script in Supabase Dashboard
echo.
echo 📋 Steps to Fix:
echo 1. Open Supabase Dashboard
echo 2. Go to SQL Editor
echo 3. Execute: add_qualification_protocol_type.sql
echo 4. Restart the application
echo.
echo 🎯 SQL Command:
echo ALTER TYPE document_type ADD VALUE 'qualification_protocol';
echo.
echo ⚠️  Important:
echo - This must be done in Supabase Dashboard
echo - Cannot be done from the application
echo - Requires database admin privileges
echo.
echo Starting application after fix...
npm run dev


























