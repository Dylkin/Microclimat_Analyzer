-- Скрипт для оптимизации базы данных Microclimat Analyzer
-- Выполнить в Supabase SQL Editor

-- 1. Анализ статистики таблиц
ANALYZE;

-- 2. Пересоздание индексов для лучшей производительности
-- ВНИМАНИЕ: CREATE INDEX CONCURRENTLY не работает в транзакциях
-- Выполняйте эти команды по одной в Supabase SQL Editor

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
CREATE INDEX IF NOT EXISTS idx_qualification_objects_project_type 
ON qualification_objects (project_id, type);

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

-- 3. Очистка неиспользуемых индексов
-- (Выполнить после анализа использования)

-- 4. Оптимизация запросов с JSONB
-- Создание GIN индексов для JSONB полей
CREATE INDEX IF NOT EXISTS idx_qualification_objects_technical_parameters_gin 
ON qualification_objects USING gin (technical_parameters);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones_gin 
ON qualification_objects USING gin (measurement_zones);

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin 
ON audit_logs USING gin (details);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_metadata_gin 
ON uploaded_files USING gin (metadata);

-- 5. Создание материализованных представлений для часто используемых запросов
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_summary AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.contract_number,
    p.contract_date,
    c.name AS contractor_name,
    COUNT(DISTINCT pqo.qualification_object_id) AS objects_count,
    COUNT(DISTINCT pd.id) AS documents_count,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN contractors c ON p.contractor_id = c.id
LEFT JOIN project_qualification_objects pqo ON p.id = pqo.project_id
LEFT JOIN project_documents pd ON p.id = pd.project_id
GROUP BY p.id, p.name, p.status, p.contract_number, p.contract_date, c.name, p.created_at, p.updated_at;

CREATE UNIQUE INDEX ON mv_project_summary (id);
CREATE INDEX ON mv_project_summary (contractor_name);
CREATE INDEX ON mv_project_summary (status);
CREATE INDEX ON mv_project_summary (created_at DESC);

-- 6. Создание функции для обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_project_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_summary;
END;
$$ LANGUAGE plpgsql;

-- 7. Создание триггера для автоматического обновления материализованного представления
CREATE OR REPLACE FUNCTION trigger_refresh_project_summary()
RETURNS trigger AS $$
BEGIN
    PERFORM refresh_project_summary();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Настройка автовакуума для больших таблиц
-- (Настройки для Supabase уже оптимизированы)

-- 9. Создание функции для очистки старых данных
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Создание функции для очистки неиспользуемых файлов
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM uploaded_files 
    WHERE id NOT IN (
        SELECT DISTINCT unnest(ARRAY[
            pd.url,
            qo.test_data_file_url
        ])::uuid
        FROM project_documents pd
        JOIN qualification_objects qo ON pd.qualification_object_id = qo.id
        WHERE pd.url IS NOT NULL OR qo.test_data_file_url IS NOT NULL
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Создание функции для проверки целостности данных
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    issue_type TEXT,
    issue_count BIGINT
) AS $$
BEGIN
    -- Проверка "висячих" ссылок
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
        'qualification_objects'::TEXT,
        'orphaned_project_id'::TEXT,
        COUNT(*)::BIGINT
    FROM qualification_objects qo
    LEFT JOIN projects p ON qo.project_id = p.id
    WHERE p.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'qualification_stages'::TEXT,
        'orphaned_object_id'::TEXT,
        COUNT(*)::BIGINT
    FROM qualification_stages qs
    LEFT JOIN qualification_objects qo ON qs.object_id = qo.id
    WHERE qo.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'project_qualification_objects'::TEXT,
        'orphaned_project_id'::TEXT,
        COUNT(*)::BIGINT
    FROM project_qualification_objects pqo
    LEFT JOIN projects p ON pqo.project_id = p.id
    WHERE p.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'project_qualification_objects'::TEXT,
        'orphaned_qualification_object_id'::TEXT,
        COUNT(*)::BIGINT
    FROM project_qualification_objects pqo
    LEFT JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
    WHERE qo.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 12. Создание функции для получения статистики базы данных
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

-- 13. Создание функции для мониторинга производительности
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LEFT(query, 100)::TEXT,
        calls,
        total_time,
        mean_time,
        rows
    FROM pg_stat_statements
    ORDER BY total_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 14. Создание функции для анализа использования индексов
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        i.indexname::TEXT,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::TEXT,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_indexes i
    JOIN pg_tables t ON i.tablename = t.tablename
    LEFT JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
    WHERE t.schemaname = 'public'
    ORDER BY pg_relation_size(i.indexname::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- 15. Создание функции для мониторинга блокировок
CREATE OR REPLACE FUNCTION get_lock_stats()
RETURNS TABLE(
    lock_type TEXT,
    database_name TEXT,
    relation_name TEXT,
    page INTEGER,
    tuple SMALLINT,
    virtualxid TEXT,
    transactionid BIGINT,
    classid OID,
    objid OID,
    objsubid SMALLINT,
    virtualtransaction TEXT,
    pid INTEGER,
    mode TEXT,
    granted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.locktype::TEXT,
        d.datname::TEXT,
        c.relname::TEXT,
        l.page,
        l.tuple,
        l.virtualxid::TEXT,
        l.transactionid,
        l.classid,
        l.objid,
        l.objsubid,
        l.virtualtransaction::TEXT,
        l.pid,
        l.mode::TEXT,
        l.granted
    FROM pg_locks l
    LEFT JOIN pg_database d ON l.database = d.oid
    LEFT JOIN pg_class c ON l.relation = c.oid
    WHERE l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
    ORDER BY l.granted, l.pid;
END;
$$ LANGUAGE plpgsql;

-- 16. Создание функции для мониторинга активных соединений
CREATE OR REPLACE FUNCTION get_active_connections()
RETURNS TABLE(
    pid INTEGER,
    usename TEXT,
    application_name TEXT,
    client_addr INET,
    client_port INTEGER,
    backend_start TIMESTAMPTZ,
    state TEXT,
    query TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.pid,
        p.usename::TEXT,
        p.application_name::TEXT,
        p.client_addr,
        p.client_port,
        p.backend_start,
        p.state::TEXT,
        LEFT(p.query, 100)::TEXT
    FROM pg_stat_activity p
    WHERE p.datname = current_database()
    ORDER BY p.backend_start;
END;
$$ LANGUAGE plpgsql;

-- 17. Создание функции для мониторинга размеров таблиц
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT,
    bloat_ratio DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        s.n_live_tup,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_indexes_size(c.oid))::TEXT,
        pg_size_pretty(pg_indexes_size(c.oid))::TEXT,
        pg_size_pretty(pg_total_relation_size(c.oid))::TEXT,
        CASE 
            WHEN s.n_live_tup > 0 THEN 
                (s.n_dead_tup::DOUBLE PRECISION / s.n_live_tup::DOUBLE PRECISION) * 100
            ELSE 0
        END
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_stat_user_tables s ON s.relname = t.tablename
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

-- 18. Создание функции для мониторинга производительности запросов
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    min_time DOUBLE PRECISION,
    max_time DOUBLE PRECISION,
    stddev_time DOUBLE PRECISION,
    rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LEFT(query, 200)::TEXT,
        calls,
        total_time,
        mean_time,
        min_time,
        max_time,
        stddev_time,
        rows
    FROM pg_stat_statements
    WHERE mean_time > 1000  -- Запросы дольше 1 секунды
    ORDER BY mean_time DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- 19. Создание функции для мониторинга использования памяти
CREATE OR REPLACE FUNCTION get_memory_usage()
RETURNS TABLE(
    name TEXT,
    setting TEXT,
    unit TEXT,
    category TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        name::TEXT,
        setting::TEXT,
        unit::TEXT,
        category::TEXT
    FROM pg_settings
    WHERE name IN (
        'shared_buffers',
        'effective_cache_size',
        'work_mem',
        'maintenance_work_mem',
        'wal_buffers',
        'checkpoint_completion_target',
        'random_page_cost',
        'effective_io_concurrency'
    )
    ORDER BY name;
END;
$$ LANGUAGE plpgsql;

-- 20. Создание функции для мониторинга WAL (Write-Ahead Logging)
CREATE OR REPLACE FUNCTION get_wal_stats()
RETURNS TABLE(
    metric TEXT,
    value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'WAL files'::TEXT,
        COUNT(*)::TEXT
    FROM pg_ls_waldir();
    
    RETURN QUERY
    SELECT 
        'WAL size'::TEXT,
        pg_size_pretty(SUM(size))::TEXT
    FROM pg_ls_waldir();
    
    RETURN QUERY
    SELECT 
        'WAL segments'::TEXT,
        COUNT(*)::TEXT
    FROM pg_ls_waldir()
    WHERE name LIKE '%.log';
END;
$$ LANGUAGE plpgsql;
