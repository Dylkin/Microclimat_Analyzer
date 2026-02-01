@echo off
echo ========================================
echo Complete Fix for Microclimat Analyzer
echo ========================================
echo.
echo Status: RLS is disabled for most tables ✅
echo Issue: Equipment table is missing ❌
echo.
echo To complete the fix:
echo.
echo 1. Open Supabase Dashboard: https://supabase.com/dashboard
echo 2. Go to SQL Editor
echo 3. Run this SQL command:
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
echo 4. After running the SQL, try creating a project in your app
echo.
echo Alternative: Use the RLS Manager in your application
echo - Go to http://localhost:5173
echo - Click "RLS Manager" in sidebar
echo - Click "Создать недостающие таблицы"
echo.
echo Starting development server...
npm run dev


























