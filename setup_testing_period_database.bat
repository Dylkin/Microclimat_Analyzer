@echo off
echo ========================================
echo Настройка базы данных для периода испытаний
echo ========================================
echo.
echo Добавляются поля в таблицу testing_periods:
echo - testing_start_date (дата начала периода проведения испытаний)
echo - testing_end_date (дата окончания периода проведения испытаний)
echo.
echo Инструкции:
echo 1. Откройте Supabase Dashboard: https://supabase.com/dashboard
echo 2. Выберите ваш проект
echo 3. Перейдите в SQL Editor
echo 4. Скопируйте и выполните содержимое файла add_testing_period_fields.sql
echo.
echo Или выполните команды вручную:
echo.
echo -- Добавление новых полей
echo ALTER TABLE testing_periods 
echo ADD COLUMN IF NOT EXISTS testing_start_date TIMESTAMP WITH TIME ZONE,
echo ADD COLUMN IF NOT EXISTS testing_end_date TIMESTAMP WITH TIME ZONE;
echo.
echo -- Добавление комментариев
echo COMMENT ON COLUMN testing_periods.testing_start_date IS 'Дата начала периода проведения испытаний';
echo COMMENT ON COLUMN testing_periods.testing_end_date IS 'Дата окончания периода проведения испытаний';
echo.
echo -- Создание индексов
echo CREATE INDEX IF NOT EXISTS idx_testing_periods_testing_start_date ON testing_periods(testing_start_date);
echo CREATE INDEX IF NOT EXISTS idx_testing_periods_testing_end_date ON testing_periods(testing_end_date);
echo.
echo После выполнения SQL команд:
echo 1. В блоке "Испытания" появятся новые поля для периода проведения
echo 2. Можно будет указывать даты начала и окончания периода испытаний
echo 3. Данные будут сохраняться в базе данных
echo 4. Поля будут отображаться в режиме просмотра
echo.
echo Проверка:
echo - Откройте страницу "Согласование договора"
echo - Перейдите к редактированию объекта квалификации
echo - В блоке "Испытания" должны появиться новые поля
echo - Укажите период проведения испытаний
echo - Сохраните изменения
echo - Обновите страницу - данные должны сохраниться
echo.
pause























