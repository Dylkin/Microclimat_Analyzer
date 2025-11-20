-- Безопасный скрипт оптимизации базы данных
-- Выполнить в Supabase SQL Editor

-- 1. Анализ статистики таблиц
ANALYZE;

-- 2. Создание основных индексов
-- Индексы для contractors
CREATE INDEX IF NOT EXISTS idx_contractors_name_lower 
ON contractors (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_contractors_address 
ON contractors (address) WHERE address IS NOT NULL;

-- Индексы для projects
CREATE INDEX IF NOT EXISTS idx_projects_contractor_status 
ON projects (contractor_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
ON projects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_contract_date 
ON projects (contract_date) WHERE contract_date IS NOT NULL;

-- Индексы для qualification_objects
CREATE INDEX IF NOT EXISTS idx_qualification_objects_status 
ON qualification_objects (overall_status);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_manufacturer 
ON qualification_objects (manufacturer) WHERE manufacturer IS NOT NULL;

-- Индексы для qualification_stages
CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_status 
ON qualification_stages (object_id, status);

CREATE INDEX IF NOT EXISTS idx_qualification_stages_assignee 
ON qualification_stages (assignee_id) WHERE assignee_id IS NOT NULL;

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

-- 3. GIN индексы для JSONB полей
CREATE INDEX IF NOT EXISTS idx_qualification_objects_technical_parameters_gin 
ON qualification_objects USING gin (technical_parameters);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones_gin 
ON qualification_objects USING gin (measurement_zones);

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin 
ON audit_logs USING gin (details);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_metadata_gin 
ON uploaded_files USING gin (metadata);

-- 4. Создание простого материализованного представления
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_summary AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.contract_number,
    p.contract_date,
    c.name AS contractor_name,
    COUNT(DISTINCT pd.id) AS documents_count,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN contractors c ON p.contractor_id = c.id
LEFT JOIN project_documents pd ON p.id = pd.project_id
GROUP BY p.id, p.name, p.status, p.contract_number, p.contract_date, c.name, p.created_at, p.updated_at;

-- Создание индексов для материализованного представления
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_project_summary_id ON mv_project_summary (id);
CREATE INDEX IF NOT EXISTS idx_mv_project_summary_contractor ON mv_project_summary (contractor_name);
CREATE INDEX IF NOT EXISTS idx_mv_project_summary_status ON mv_project_summary (status);
CREATE INDEX IF NOT EXISTS idx_mv_project_summary_created_at ON mv_project_summary (created_at DESC);

-- 5. Создание функции для обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_project_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_project_summary;
END;
$$ LANGUAGE plpgsql;

-- 6. Создание функции для получения статистики базы данных
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        s.n_live_tup,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_indexes_size(c.oid))::TEXT,
        pg_size_pretty(pg_indexes_size(c.oid))::TEXT,
        pg_size_pretty(pg_total_relation_size(c.oid))::TEXT
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_stat_user_tables s ON s.relname = t.tablename
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Создание функции для проверки целостности данных
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    issue_type TEXT,
    issue_count BIGINT
) AS $$
BEGIN
    -- Проверка "висячих" ссылок в projects
    RETURN QUERY
    SELECT 
        'projects'::TEXT,
        'orphaned_contractor_id'::TEXT,
        COUNT(*)::BIGINT
    FROM projects p
    LEFT JOIN contractors c ON p.contractor_id = c.id
    WHERE c.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'qualification_stages'::TEXT,
        'orphaned_object_id'::TEXT,
        COUNT(*)::BIGINT
    FROM qualification_stages qs
    LEFT JOIN qualification_objects qo ON qs.object_id = qo.id
    WHERE qo.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Обновление материализованного представления
SELECT refresh_project_summary();

-- 9. Проверка целостности данных
SELECT * FROM check_data_integrity();

-- 10. Получение статистики базы данных
SELECT * FROM get_database_stats();















