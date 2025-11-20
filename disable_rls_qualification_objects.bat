@echo off
echo ========================================
echo Отключение RLS для qualification-objects
echo ========================================
echo.
echo Проблема: Ошибка "new row violates row-level security policy" при загрузке файлов планов
echo Причина: RLS политики требуют Supabase Auth, но приложение использует собственную аутентификацию
echo.
echo Решение: Создание публичных политик для bucket 'qualification-objects'
echo.
echo ВНИМАНИЕ: Это временное решение для разработки!
echo В продакшене следует использовать правильную аутентификацию.
echo.
echo Инструкции:
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в SQL Editor
echo 4. Скопируйте и выполните содержимое файла disable_rls_qualification_objects.sql
echo.
echo Или выполните команды вручную:
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
echo После выполнения SQL команд:
echo 1. Попробуйте снова загрузить файл плана объекта квалификации
echo 2. Ошибка "new row violates row-level security policy" должна исчезнуть
echo.
echo ========================================
echo Нажмите любую клавишу для выхода...
pause >nul























