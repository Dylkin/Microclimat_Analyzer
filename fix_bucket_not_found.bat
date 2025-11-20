@echo off
echo ========================================
echo Исправление ошибки "Bucket not found"
echo ========================================
echo.
echo Проблема: Загруженные документы не открываются с ошибкой "Bucket not found"
echo Решение: Создание bucket 'documents' в Supabase Storage
echo.
echo Инструкции:
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в SQL Editor
echo 4. Скопируйте и выполните содержимое файла fix_bucket_not_found.sql
echo.
echo Или выполните команды вручную:
echo.
echo -- Создание публичного bucket для документов
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
echo После выполнения SQL команд:
echo 1. Вернитесь в приложение
echo 2. Попробуйте загрузить и открыть документ
echo 3. Ошибка "Bucket not found" должна исчезнуть
echo.
pause























