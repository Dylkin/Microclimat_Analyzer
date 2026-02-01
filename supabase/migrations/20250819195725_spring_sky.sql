/*
  # Удаление неиспользуемых таблиц

  1. Удаляемые таблицы
    - `users` - система пользователей (используется локальная авторизация)
    - `clients` - справочник контрагентов
    - `projects` - управление проектами
    - `qualification_objects` - объекты квалификации
    - `qualification_stages` - этапы квалификации
    - `project_activities` - активности проектов
    - `project_documents` - документы проектов
    - `notifications` - уведомления

  2. Оставляемые таблицы
    - `uploaded_files` - загруженные файлы данных
    - `device_metadata` - метаданные устройств
    - `measurement_records` - записи измерений
    - `analysis_sessions` - сессии анализа
    - `chart_settings` - настройки графиков
    - `vertical_markers` - вертикальные маркеры

  3. Удаляемые типы
    - Все enum типы, связанные с управлением проектами
*/

-- Удаляем таблицы в правильном порядке (сначала зависимые, потом основные)

-- Удаляем уведомления
DROP TABLE IF EXISTS notifications CASCADE;

-- Удаляем документы проектов
DROP TABLE IF EXISTS project_documents CASCADE;

-- Удаляем активности проектов
DROP TABLE IF EXISTS project_activities CASCADE;

-- Удаляем этапы квалификации
DROP TABLE IF EXISTS qualification_stages CASCADE;

-- Удаляем объекты квалификации
DROP TABLE IF EXISTS qualification_objects CASCADE;

-- Удаляем проекты
DROP TABLE IF EXISTS projects CASCADE;

-- Удаляем контрагентов
DROP TABLE IF EXISTS clients CASCADE;

-- Удаляем пользователей
DROP TABLE IF EXISTS users CASCADE;

-- Удаляем неиспользуемые enum типы
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS project_priority CASCADE;
DROP TYPE IF EXISTS project_type CASCADE;
DROP TYPE IF EXISTS qualification_object_type CASCADE;
DROP TYPE IF EXISTS qualification_stage_type CASCADE;
DROP TYPE IF EXISTS qualification_stage_status CASCADE;
DROP TYPE IF EXISTS qualification_object_status CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Удаляем функции-триггеры, которые больше не нужны
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS check_single_manager() CASCADE;