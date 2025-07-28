/*
  # Удаление всех пользовательских таблиц и функций

  1. Удаляем все таблицы
    - `vertical_lines`
    - `test_reports` 
    - `measurement_data`
    - `data_files`
    - `users`

  2. Удаляем функции и триггеры
    - `update_updated_at_column()`
    - `check_single_manager()`

  3. Удаляем типы
    - `user_role`
    - `file_status`
*/

-- Удаляем таблицы в правильном порядке (с учетом внешних ключей)
DROP TABLE IF EXISTS vertical_lines CASCADE;
DROP TABLE IF EXISTS test_reports CASCADE;
DROP TABLE IF EXISTS measurement_data CASCADE;
DROP TABLE IF EXISTS data_files CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Удаляем функции
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS check_single_manager() CASCADE;

-- Удаляем типы
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS file_status CASCADE;