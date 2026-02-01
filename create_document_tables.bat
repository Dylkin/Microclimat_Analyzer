@echo off
echo ========================================
echo Создание таблиц для комментариев и согласования документов
echo ========================================
echo.
echo Создаются таблицы:
echo - document_comments (комментарии к документам)
echo - document_approvals (записи согласования документов)
echo.
echo Инструкции:
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в SQL Editor (слева в меню)
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
echo -- Создание политик для комментариев
echo CREATE POLICY "Users can view all comments" ON document_comments FOR SELECT USING (true);
echo CREATE POLICY "Authenticated users can insert comments" ON document_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
echo.
echo -- Создание политик для согласований
echo CREATE POLICY "Users can view all approvals" ON document_approvals FOR SELECT USING (true);
echo CREATE POLICY "Authenticated users can insert approvals" ON document_approvals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
echo.
echo После выполнения SQL команд:
echo 1. Таблицы document_comments и document_approvals будут созданы
echo 2. RLS (Row Level Security) будет включен
echo 3. Политики безопасности будут настроены
echo 4. Индексы для оптимизации запросов будут созданы
echo 5. Триггеры для автоматического обновления updated_at будут созданы
echo.
echo Проверка:
echo - Перейдите в Table Editor в Supabase Dashboard
echo - Должны появиться таблицы document_comments и document_approvals
echo - В каждой таблице должны быть поля: id, document_id, user_id, user_name, comment, created_at, updated_at
echo - В таблице document_approvals дополнительно: status
echo.
echo Если таблицы созданы успешно:
echo ✅ Комментарии пользователей будут сохраняться в document_comments
echo ✅ Статусы согласования документов будут сохраняться в document_approvals
echo ✅ Данные будут сохраняться между сессиями
echo ✅ Приложение будет работать корректно
echo.
pause























