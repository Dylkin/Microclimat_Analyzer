/*
  # Исправление внешнего ключа created_by в таблице projects

  1. Изменения
    - Удаляем старый внешний ключ на auth.users
    - Добавляем новый внешний ключ на локальную таблицу users
    - Обновляем существующие записи с некорректными created_by

  2. Безопасность
    - Сохраняем все существующие данные
    - Устанавливаем NULL для некорректных ссылок
*/

-- Удаляем старый внешний ключ на auth.users
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;

-- Обновляем некорректные ссылки на NULL
UPDATE projects 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = projects.created_by
  );

-- Добавляем новый внешний ключ на локальную таблицу users
ALTER TABLE projects 
ADD CONSTRAINT projects_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Обновляем индекс
DROP INDEX IF EXISTS idx_projects_created_by;
CREATE INDEX idx_projects_created_by ON projects(created_by) WHERE created_by IS NOT NULL;