@echo off
echo ========================================
echo Настройка базы данных для улучшенного CRUD периодов испытаний
echo ========================================
echo.
echo Этот скрипт поможет вам применить изменения в базе данных
echo для поддержки новых полей периода проведения испытаний.
echo.
echo Изменения в базе данных:
echo 1. Добавление полей testing_start_date и testing_end_date
echo 2. Создание индексов для оптимизации запросов
echo 3. Добавление ограничений для валидации данных
echo 4. Проверка целостности данных
echo.
echo Инструкции:
echo.
echo 1. Откройте Supabase Dashboard:
echo    - Перейдите на https://supabase.com/dashboard
echo    - Войдите в свой аккаунт
echo    - Выберите ваш проект
echo.
echo 2. Откройте SQL Editor:
echo    - В левом меню нажмите "SQL Editor"
echo    - Нажмите "New query"
echo.
echo 3. Выполните SQL скрипт:
echo    - Скопируйте содержимое файла add_testing_period_fields_enhanced.sql
echo    - Вставьте в SQL Editor
echo    - Нажмите "Run" для выполнения
echo.
echo 4. Проверьте результаты:
echo    - Убедитесь, что скрипт выполнился без ошибок
echo    - Проверьте, что появилось сообщение об успешном выполнении
echo    - Проверьте, что поля добавлены в таблицу
echo.
echo 5. Проверка в базе данных:
echo    - Перейдите в "Table Editor"
echo    - Найдите таблицу "qualification_object_testing_periods"
echo    - Проверьте, что появились поля:
echo      * testing_start_date
echo      * testing_end_date
echo.
echo Альтернативный способ (через командную строку):
echo 1. Установите Supabase CLI
echo 2. Выполните команду:
echo    supabase db push
echo.
echo Если возникли ошибки:
echo 1. Проверьте, что таблица qualification_object_testing_periods существует
echo 2. Проверьте, что у вас есть права на изменение схемы
echo 3. Проверьте, что поля еще не добавлены
echo 4. Обратитесь к документации Supabase
echo.
echo После успешного выполнения:
echo 1. Запустите приложение: start_with_enhanced_testing_periods_crud.bat
echo 2. Протестируйте функциональность: test_enhanced_testing_periods_crud.bat
echo 3. Проверьте, что новые поля работают корректно
echo.
echo Готово! Нажмите любую клавишу для продолжения...
pause























