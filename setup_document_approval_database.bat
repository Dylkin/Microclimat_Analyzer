@echo off
echo ========================================
echo Настройка базы данных для согласования документов
echo ========================================
echo.
echo Создаются таблицы для:
echo - Комментарии к документам (document_comments)
echo - Записи согласования документов (document_approvals)
echo.
echo Инструкции:
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в SQL Editor
echo 4. Скопируйте и выполните содержимое файла create_document_approval_tables.sql
echo.
echo Или выполните команды вручную:
echo.
echo -- Создание таблицы для комментариев
echo CREATE TABLE IF NOT EXISTS document_comments (
echo   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
echo   document_id TEXT NOT NULL,
echo   user_id TEXT NOT NULL,
echo   user_name TEXT NOT NULL,
echo   comment TEXT NOT NULL,
echo   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
echo   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
echo );
echo.
echo -- Создание таблицы для согласований
echo CREATE TABLE IF NOT EXISTS document_approvals (
echo   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
echo   document_id TEXT NOT NULL,
echo   user_id TEXT NOT NULL,
echo   user_name TEXT NOT NULL,
echo   status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
echo   comment TEXT,
echo   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
echo   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
echo );
echo.
echo -- Включение RLS и создание политик безопасности
echo ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
echo ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
echo.
echo После выполнения SQL команд:
echo 1. Комментарии пользователей будут сохраняться в базе данных
echo 2. Статусы согласования документов будут сохраняться в базе данных
echo 3. История согласований будет отображаться корректно
echo 4. Данные будут сохраняться между сессиями
echo.
echo Проверка:
echo - Добавьте комментарий к документу
echo - Согласуйте или отклоните документ
echo - Обновите страницу - данные должны сохраниться
echo.
pause























