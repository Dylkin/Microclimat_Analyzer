@echo off
echo ========================================
echo Запуск приложения после создания таблиц
echo ========================================
echo.
echo Предварительные требования:
echo 1. Таблицы document_comments и document_approvals созданы в Supabase
echo 2. RLS политики настроены
echo 3. Переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY настроены
echo.
echo Проверка создания таблиц:
echo 1. Откройте Supabase Dashboard
echo 2. Перейдите в Table Editor
echo 3. Убедитесь, что таблицы document_comments и document_approvals существуют
echo.
echo Если таблицы НЕ созданы:
echo 1. Выполните команды из quick_create_document_tables.sql в SQL Editor
echo 2. Или запустите create_document_tables.bat для инструкций
echo.
echo Теперь приложение будет работать с полным функционалом:
echo - Комментарии пользователей будут сохраняться в document_comments
echo - Статусы согласования документов будут сохраняться в document_approvals
echo - Данные будут сохраняться между сессиями
echo - При повторном открытии проекта все данные будут отображаться
echo.
echo Проверка работы:
echo 1. Откройте страницу "Согласование договора"
echo 2. Добавьте комментарии к документам
echo 3. Согласуйте или отклоните документы
echo 4. Обновите страницу - данные должны сохраниться
echo 5. Перезапустите приложение - данные должны отображаться
echo.
npm run dev























