-- Адаптивная оптимизация базы данных
-- Проверяет существование таблиц перед созданием индексов
-- Выполнить в Supabase SQL Editor

-- ==============================================
-- 1. ОСНОВНЫЕ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==============================================

-- Индексы для contractors (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractors' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_contractors_name_lower ON contractors (LOWER(name));
        CREATE INDEX IF NOT EXISTS idx_contractors_address ON contractors (address) WHERE address IS NOT NULL;
        RAISE NOTICE 'Индексы для contractors созданы';
    ELSE
        RAISE NOTICE 'Таблица contractors не существует';
    END IF;
END $$;

-- Индексы для projects (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_projects_contractor_status ON projects (contractor_id, status);
        CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_projects_contract_date ON projects (contract_date) WHERE contract_date IS NOT NULL;
        RAISE NOTICE 'Индексы для projects созданы';
    ELSE
        RAISE NOTICE 'Таблица projects не существует';
    END IF;
END $$;

-- Индексы для qualification_objects (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qualification_objects' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_type ON qualification_objects (contractor_id, type);
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_type ON qualification_objects (type);
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_manufacturer ON qualification_objects (manufacturer) WHERE manufacturer IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_created_at ON qualification_objects (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_updated_at ON qualification_objects (updated_at DESC);
        RAISE NOTICE 'Индексы для qualification_objects созданы';
    ELSE
        RAISE NOTICE 'Таблица qualification_objects не существует';
    END IF;
END $$;

-- Индексы для qualification_stages (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qualification_stages' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_status ON qualification_stages (object_id, status);
        CREATE INDEX IF NOT EXISTS idx_qualification_stages_assignee ON qualification_stages (assignee_id) WHERE assignee_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_qualification_stages_dates ON qualification_stages (planned_start_date, planned_end_date);
        RAISE NOTICE 'Индексы для qualification_stages созданы';
    ELSE
        RAISE NOTICE 'Таблица qualification_stages не существует';
    END IF;
END $$;

-- Индексы для project_documents (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_documents' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents (document_type);
        CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at ON project_documents (uploaded_at DESC);
        RAISE NOTICE 'Индексы для project_documents созданы';
    ELSE
        RAISE NOTICE 'Таблица project_documents не существует';
    END IF;
END $$;

-- Индексы для uploaded_files (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_files' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_type_size ON uploaded_files (file_type, file_size);
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files (uploaded_at DESC);
        RAISE NOTICE 'Индексы для uploaded_files созданы';
    ELSE
        RAISE NOTICE 'Таблица uploaded_files не существует';
    END IF;
END $$;

-- Индексы для audit_logs (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs (user_id, action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
        RAISE NOTICE 'Индексы для audit_logs созданы';
    ELSE
        RAISE NOTICE 'Таблица audit_logs не существует';
    END IF;
END $$;

-- ==============================================
-- 2. ИНДЕКСЫ ДЛЯ JSONB ПОЛЕЙ
-- ==============================================

-- Индекс для measurement_zones в qualification_objects
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
          AND column_name = 'measurement_zones' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones_gin 
        ON qualification_objects USING GIN (measurement_zones);
        RAISE NOTICE 'GIN индекс для measurement_zones создан';
    ELSE
        RAISE NOTICE 'Колонка measurement_zones не существует в qualification_objects';
    END IF;
END $$;

-- Индекс для details в audit_logs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
          AND column_name = 'details' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin 
        ON audit_logs USING GIN (details);
        RAISE NOTICE 'GIN индекс для details создан';
    ELSE
        RAISE NOTICE 'Колонка details не существует в audit_logs';
    END IF;
END $$;

-- ==============================================
-- 3. ЧАСТИЧНЫЕ ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
-- ==============================================

-- Индексы только для активных записей
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_projects_active 
        ON projects (contractor_id, created_at) 
        WHERE status IN ('active', 'in_progress');
        RAISE NOTICE 'Частичный индекс для активных проектов создан';
    END IF;
END $$;

-- Индексы для объектов с планами
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
          AND column_name = 'plan_file_url' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_with_plans 
        ON qualification_objects (contractor_id, type) 
        WHERE plan_file_url IS NOT NULL;
        RAISE NOTICE 'Частичный индекс для объектов с планами создан';
    END IF;
END $$;

-- Индексы для объектов с координатами
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
          AND column_name = 'latitude' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_with_coordinates 
        ON qualification_objects (latitude, longitude) 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        RAISE NOTICE 'Частичный индекс для объектов с координатами создан';
    END IF;
END $$;

-- ==============================================
-- 4. ИНДЕКСЫ ДЛЯ ПОИСКА И ФИЛЬТРАЦИИ
-- ==============================================

-- Поиск по названию объектов
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qualification_objects' AND table_schema = 'public') THEN
        -- Проверяем, установлено ли расширение pg_trgm
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
            CREATE INDEX IF NOT EXISTS idx_qualification_objects_name_trgm 
            ON qualification_objects USING GIN (name gin_trgm_ops);
            RAISE NOTICE 'Триграммный индекс для названий объектов создан';
        ELSE
            RAISE NOTICE 'Расширение pg_trgm не установлено, триграммный индекс не создан';
        END IF;
    END IF;
END $$;

-- Поиск по адресу
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qualification_objects' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
            CREATE INDEX IF NOT EXISTS idx_qualification_objects_address_trgm 
            ON qualification_objects USING GIN (address gin_trgm_ops);
            RAISE NOTICE 'Триграммный индекс для адресов создан';
        ELSE
            RAISE NOTICE 'Расширение pg_trgm не установлено, триграммный индекс для адресов не создан';
        END IF;
    END IF;
END $$;

-- Поиск по серийному номеру
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
          AND column_name = 'serial_number' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_serial_number 
        ON qualification_objects (serial_number) 
        WHERE serial_number IS NOT NULL AND serial_number != '';
        RAISE NOTICE 'Индекс для серийных номеров создан';
    END IF;
END $$;

-- Поиск по инвентарному номеру
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
          AND column_name = 'inventory_number' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_inventory_number 
        ON qualification_objects (inventory_number) 
        WHERE inventory_number IS NOT NULL AND inventory_number != '';
        RAISE NOTICE 'Индекс для инвентарных номеров создан';
    END IF;
END $$;

-- ==============================================
-- 5. ИНДЕКСЫ ДЛЯ СВЯЗЕЙ МЕЖДУ ТАБЛИЦАМИ
-- ==============================================

-- Связь qualification_objects -> contractors
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
          AND column_name = 'contractor_id' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_fk 
        ON qualification_objects (contractor_id);
        RAISE NOTICE 'FK индекс для contractor_id создан';
    END IF;
END $$;

-- Связь qualification_stages -> qualification_objects
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_stages' 
          AND column_name = 'object_id' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_fk 
        ON qualification_stages (object_id);
        RAISE NOTICE 'FK индекс для object_id создан';
    END IF;
END $$;

-- Связь project_documents -> projects
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_documents' 
          AND column_name = 'project_id' 
          AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_project_documents_project_fk 
        ON project_documents (project_id);
        RAISE NOTICE 'FK индекс для project_id создан';
    END IF;
END $$;

-- ==============================================
-- 6. СТАТИСТИКА И АНАЛИЗ
-- ==============================================

-- Обновление статистики для существующих таблиц
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || quote_ident(table_name);
        RAISE NOTICE 'Статистика обновлена для таблицы: %', table_name;
    END LOOP;
END $$;

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

-- Список всех таблиц в схеме public
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;











