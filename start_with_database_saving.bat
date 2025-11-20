@echo off
echo ========================================
echo Запуск с исправленным сохранением в базе данных
echo ========================================
echo.
echo Исправления:
echo 1. Комментарии пользователей сохраняются в базе данных
echo 2. Статусы согласования документов сохраняются в базе данных
echo 3. История согласований загружается из базы данных
echo 4. Данные сохраняются между сессиями
echo.
echo Изменения в коде:
echo - DocumentApprovalService: убраны заглушки, добавлены реальные запросы к БД
echo - DocumentApprovalActions: использует новый метод cancelApproval
echo - Созданы таблицы document_comments и document_approvals
echo.
echo Перед запуском убедитесь, что:
echo 1. Выполнены SQL команды из create_document_approval_tables.sql
echo 2. Настроены переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
echo 3. Пользователь авторизован в приложении
echo.
echo Теперь на странице "Согласование договора":
echo - Комментарии сохраняются в таблице document_comments
echo - Статусы согласования сохраняются в таблице document_approvals
echo - История согласований загружается из базы данных
echo - Данные не теряются при обновлении страницы
echo.
npm run dev























