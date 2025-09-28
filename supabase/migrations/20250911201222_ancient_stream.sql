/*
  # Нормализация связей для периодов испытаний объектов квалификации

  1. Изменения в таблице
    - Удаляем избыточную связь с проектом (project_id)
    - Оставляем только связь с объектом квалификации
    - Проект определяется через объект квалификации

  2. Обновление индексов
    - Удаляем индекс по project_id
    - Оставляем индекс по qualification_object_id

  3. Обновление внешних ключей
    - Удаляем внешний ключ на projects
    - Оставляем только связь с qualification_objects
*/

-- Удаляем внешний ключ на projects
ALTER TABLE qualification_object_testing_periods 
DROP CONSTRAINT IF EXISTS qualification_object_testing_periods_project_id_fkey;

-- Удаляем индекс по project_id
DROP INDEX IF EXISTS idx_qualification_object_testing_periods_project_id;

-- Удаляем колонку project_id (она избыточна, так как проект определяется через объект квалификации)
ALTER TABLE qualification_object_testing_periods 
DROP COLUMN IF EXISTS project_id;

-- Обновляем триггер для updated_at
DROP TRIGGER IF EXISTS update_qualification_object_testing_periods_updated_at ON qualification_object_testing_periods;

CREATE TRIGGER update_qualification_object_testing_periods_updated_at
  BEFORE UPDATE ON qualification_object_testing_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();