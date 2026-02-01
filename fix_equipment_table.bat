@echo off
echo ========================================
echo Fix Equipment Table Issue
echo ========================================
echo.
echo The equipment table is missing from your Supabase database.
echo.
echo To fix this issue:
echo.
echo 1. Go to https://supabase.com/dashboard
echo 2. Select your project
echo 3. Go to SQL Editor
echo 4. Copy and paste this SQL command:
echo.
echo CREATE TABLE IF NOT EXISTS equipment (
echo     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
echo     name VARCHAR(255) NOT NULL,
echo     model VARCHAR(255),
echo     serial_number VARCHAR(255),
echo     manufacturer VARCHAR(255),
echo     type VARCHAR(100),
echo     status VARCHAR(50) DEFAULT 'active',
echo     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
echo     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
echo );
echo.
echo ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
echo.
echo 5. Run the SQL commands
echo 6. Go back to your application and try creating a project again
echo.
echo Opening the SQL file for you to copy...
notepad fix_rls_policies.sql
echo.
echo After running the SQL commands in Supabase, press any key to continue...
pause
echo.
echo Starting development server...
npm run dev


























