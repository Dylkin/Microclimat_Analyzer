@echo off
echo ========================================
echo Исправление проблемы загрузки планов объектов
echo ========================================
echo.
echo Проблема: При загрузке файлов планов объектов квалификации возникает ошибка:
echo "new row violates row-level security policy"
echo.
echo Решение: Выполните SQL команды в Supabase SQL Editor
echo.
echo 1. Откройте Supabase Dashboard
echo 2. Перейдите в SQL Editor
echo 3. Выполните команды из файла: disable_rls_qualification_objects.sql
echo.
echo Или выполните эти команды напрямую:
echo.
echo -- Создание bucket qualification-objects
echo INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
echo VALUES (
echo   'qualification-objects',
echo   'qualification-objects',
echo   true,
echo   52428800,
echo   ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']
echo )
echo ON CONFLICT (id) DO UPDATE SET
echo   public = true,
echo   file_size_limit = 52428800,
echo   allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
echo.
echo -- Создание публичных политик
echo CREATE POLICY "Public can view qualification objects" ON storage.objects
echo FOR SELECT USING (bucket_id = 'qualification-objects');
echo.
echo CREATE POLICY "Public can upload qualification objects" ON storage.objects
echo FOR INSERT WITH CHECK (bucket_id = 'qualification-objects');
echo.
echo CREATE POLICY "Public can update qualification objects" ON storage.objects
echo FOR UPDATE USING (bucket_id = 'qualification-objects');
echo.
echo CREATE POLICY "Public can delete qualification objects" ON storage.objects
echo FOR DELETE USING (bucket_id = 'qualification-objects');
echo.
echo 4. После выполнения команд попробуйте загрузить файл плана снова
echo.
echo ========================================
echo Готово! Теперь загрузка файлов планов должна работать.
echo ========================================
pause























