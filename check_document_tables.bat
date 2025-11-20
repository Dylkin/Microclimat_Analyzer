@echo off
echo ========================================
echo Проверка создания таблиц для комментариев и согласования
echo ========================================
echo.
echo Проверяем наличие таблиц:
echo - document_comments
echo - document_approvals
echo.
echo Инструкции для проверки:
echo.
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в Table Editor (слева в меню)
echo 4. Проверьте, что в списке таблиц есть:
echo   * document_comments
echo   * document_approvals
echo.
echo Если таблицы НЕ созданы:
echo 1. Перейдите в SQL Editor
echo 2. Выполните команды из файла quick_create_document_tables.sql
echo 3. Или выполните команды из файла create_document_approval_tables.sql
echo.
echo SQL запросы для проверки:
echo.
echo -- Проверка существования таблиц
echo SELECT table_name 
echo FROM information_schema.tables 
echo WHERE table_schema = 'public' 
echo AND table_name IN ('document_comments', 'document_approvals');
echo.
echo -- Проверка структуры таблицы document_comments
echo SELECT column_name, data_type, is_nullable 
echo FROM information_schema.columns 
echo WHERE table_name = 'document_comments' 
echo AND table_schema = 'public'
echo ORDER BY ordinal_position;
echo.
echo -- Проверка структуры таблицы document_approvals
echo SELECT column_name, data_type, is_nullable 
echo FROM information_schema.columns 
echo WHERE table_name = 'document_approvals' 
echo AND table_schema = 'public'
echo ORDER BY ordinal_position;
echo.
echo -- Проверка политик RLS
echo SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
echo FROM pg_policies 
echo WHERE tablename IN ('document_comments', 'document_approvals');
echo.
echo Ожидаемые результаты:
echo - Таблицы document_comments и document_approvals должны существовать
echo - В document_comments должны быть поля: id, document_id, user_id, user_name, comment, created_at, updated_at
echo - В document_approvals должны быть поля: id, document_id, user_id, user_name, status, comment, created_at, updated_at
echo - RLS должен быть включен для обеих таблиц
echo - Политики безопасности должны быть созданы
echo.
echo Если таблицы созданы успешно:
echo ✅ Комментарии пользователей будут сохраняться
echo ✅ Статусы согласования документов будут сохраняться
echo ✅ Данные будут сохраняться между сессиями
echo ✅ Приложение будет работать корректно
echo.
echo Если таблицы НЕ созданы:
echo ❌ Комментарии не будут сохраняться
echo ❌ Статусы согласования не будут сохраняться
echo ❌ Данные будут теряться при обновлении страницы
echo ❌ Приложение будет работать некорректно
echo.
pause























