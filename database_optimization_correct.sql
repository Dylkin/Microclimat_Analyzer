-- Оптимизация базы данных на основе реальной структуры
-- Выполнить в Supabase SQL Editor

-- ==============================================
-- 1. ОСНОВНЫЕ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==============================================

-- Индексы для contractors
CREATE INDEX IF NOT EXISTS idx_contractors_name_lower 
ON contractors (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_contractors_address 
ON contractors (address) 
WHERE address IS NOT NULL;

-- Индексы для projects
CREATE INDEX IF NOT EXISTS idx_projects_contractor_status 
ON projects (contractor_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
ON projects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_contract_date 
ON projects (contract_date) 
WHERE contract_date IS NOT NULL;

-- Индексы для qualification_objects (на основе реальной структуры)
CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_type 
ON qualification_objects (contractor_id, type);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_type 
ON qualification_objects (type);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_manufacturer 
ON qualification_objects (manufacturer) 
WHERE manufacturer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qualification_objects_created_at 
ON qualification_objects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_updated_at 
ON qualification_objects (updated_at DESC);

-- Индексы для qualification_stages
CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_status 
ON qualification_stages (object_id, status);

CREATE INDEX IF NOT EXISTS idx_qualification_stages_assignee 
ON qualification_stages (assignee_id) 
WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qualification_stages_dates 
ON qualification_stages (planned_start_date, planned_end_date);

-- Индексы для project_documents
CREATE INDEX IF NOT EXISTS idx_project_documents_type 
ON project_documents (document_type);

CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at 
ON project_documents (uploaded_at DESC);

-- Индексы для uploaded_files
CREATE INDEX IF NOT EXISTS idx_uploaded_files_type_size 
ON uploaded_files (file_type, file_size);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at 
ON uploaded_files (uploaded_at DESC);

-- Индексы для audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs (user_id, action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs (created_at DESC);

-- ==============================================
-- 2. ИНДЕКСЫ ДЛЯ JSONB ПОЛЕЙ
-- ==============================================

-- Индекс для measurement_zones в qualification_objects
CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones_gin 
ON qualification_objects USING GIN (measurement_zones);

-- Индекс для details в audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin 
ON audit_logs USING GIN (details);

-- ==============================================
-- 3. ЧАСТИЧНЫЕ ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
-- ==============================================

-- Индексы только для активных записей
CREATE INDEX IF NOT EXISTS idx_projects_active 
ON projects (contractor_id, created_at) 
WHERE status IN ('active', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_qualification_objects_with_plans 
ON qualification_objects (contractor_id, type) 
WHERE plan_file_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qualification_objects_with_coordinates 
ON qualification_objects (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ==============================================
-- 4. ИНДЕКСЫ ДЛЯ ПОИСКА И ФИЛЬТРАЦИИ
-- ==============================================

-- Поиск по названию объектов
CREATE INDEX IF NOT EXISTS idx_qualification_objects_name_trgm 
ON qualification_objects USING GIN (name gin_trgm_ops);

-- Поиск по адресу
CREATE INDEX IF NOT EXISTS idx_qualification_objects_address_trgm 
ON qualification_objects USING GIN (address gin_trgm_ops);

-- Поиск по серийному номеру
CREATE INDEX IF NOT EXISTS idx_qualification_objects_serial_number 
ON qualification_objects (serial_number) 
WHERE serial_number IS NOT NULL AND serial_number != '';

-- Поиск по инвентарному номеру
CREATE INDEX IF NOT EXISTS idx_qualification_objects_inventory_number 
ON qualification_objects (inventory_number) 
WHERE inventory_number IS NOT NULL AND inventory_number != '';

-- ==============================================
-- 5. ИНДЕКСЫ ДЛЯ СВЯЗЕЙ МЕЖДУ ТАБЛИЦАМИ
-- ==============================================

-- Связь qualification_objects -> contractors
CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_fk 
ON qualification_objects (contractor_id);

-- Связь qualification_stages -> qualification_objects
CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_fk 
ON qualification_stages (object_id);

-- Связь project_documents -> projects
CREATE INDEX IF NOT EXISTS idx_project_documents_project_fk 
ON project_documents (project_id);

-- ==============================================
-- 6. СТАТИСТИКА И АНАЛИЗ
-- ==============================================

-- Обновление статистики для оптимизатора запросов
ANALYZE contractors;
ANALYZE projects;
ANALYZE qualification_objects;
ANALYZE qualification_stages;
ANALYZE project_documents;
ANALYZE uploaded_files;
ANALYZE audit_logs;

-- ==============================================
-- 7. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ==============================================

-- Показать созданные индексы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Статистика по таблицам
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;













