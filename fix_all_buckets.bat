@echo off
echo ========================================
echo Полное исправление проблемы "Bucket not found"
echo ========================================
echo.
echo Проблема: Загруженные документы не открываются с ошибкой "Bucket not found"
echo Причина: Отсутствуют необходимые buckets в Supabase Storage
echo.
echo Решение: Создание всех необходимых buckets
echo.
echo Buckets которые будут созданы:
echo - documents (для документов проектов)
echo - qualification-objects (для файлов объектов квалификации)
echo - equipment-files (для файлов оборудования)
echo.
echo Инструкции:
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в SQL Editor
echo 4. Скопируйте и выполните содержимое файла complete_bucket_fix.sql
echo.
echo Или выполните команды вручную:
echo.
echo -- Создание всех необходимых buckets
echo INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
echo VALUES (
echo   'documents',
echo   'documents',
echo   true,
echo   52428800,
echo   ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
echo )
echo ON CONFLICT (id) DO UPDATE SET
echo   public = true,
echo   file_size_limit = 52428800,
echo   allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
echo.
echo INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
echo VALUES (
echo   'qualification-objects',
echo   'qualification-objects',
echo   true,
echo   52428800,
echo   ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
echo )
echo ON CONFLICT (id) DO UPDATE SET
echo   public = true,
echo   file_size_limit = 52428800,
echo   allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
echo.
echo INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
echo VALUES (
echo   'equipment-files',
echo   'equipment-files',
echo   true,
echo   52428800,
echo   ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
echo )
echo ON CONFLICT (id) DO UPDATE SET
echo   public = true,
echo   file_size_limit = 52428800,
echo   allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
echo.
echo После выполнения SQL команд:
echo 1. Вернитесь в приложение
echo 2. Попробуйте загрузить документ
echo 3. Попробуйте открыть существующий документ
echo 4. Ошибка "Bucket not found" должна исчезнуть
echo.
echo Проверка:
echo - Загрузка документов должна работать
echo - Просмотр документов должен работать
echo - Скачивание документов должно работать
echo.
pause























