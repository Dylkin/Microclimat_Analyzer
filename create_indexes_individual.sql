-- Скрипт для создания индексов по одному
-- Выполняйте каждую команду отдельно в Supabase SQL Editor

-- 1. Индексы для contractors
CREATE INDEX IF NOT EXISTS idx_contractors_name_lower 
ON contractors (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_contractors_address 
ON contractors (address) WHERE address IS NOT NULL;

-- 2. Индексы для projects
CREATE INDEX IF NOT EXISTS idx_projects_contractor_status 
ON projects (contractor_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
ON projects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_contract_date 
ON projects (contract_date) WHERE contract_date IS NOT NULL;

-- 3. Индексы для qualification_objects
CREATE INDEX IF NOT EXISTS idx_qualification_objects_project_type 
ON qualification_objects (project_id, type);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_status 
ON qualification_objects (overall_status);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_manufacturer 
ON qualification_objects (manufacturer) WHERE manufacturer IS NOT NULL;

-- 4. Индексы для qualification_stages
CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_status 
ON qualification_stages (object_id, status);

CREATE INDEX IF NOT EXISTS idx_qualification_stages_assignee 
ON qualification_stages (assignee_id) WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qualification_stages_dates 
ON qualification_stages (planned_start_date, planned_end_date);

-- 5. Индексы для project_documents
CREATE INDEX IF NOT EXISTS idx_project_documents_type 
ON project_documents (document_type);

CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at 
ON project_documents (uploaded_at DESC);

-- 6. Индексы для uploaded_files
CREATE INDEX IF NOT EXISTS idx_uploaded_files_type_size 
ON uploaded_files (file_type, file_size);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at 
ON uploaded_files (uploaded_at DESC);

-- 7. Индексы для audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs (user_id, action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs (entity_type, entity_id);

-- 8. GIN индексы для JSONB полей
CREATE INDEX IF NOT EXISTS idx_qualification_objects_technical_parameters_gin 
ON qualification_objects USING gin (technical_parameters);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones_gin 
ON qualification_objects USING gin (measurement_zones);

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin 
ON audit_logs USING gin (details);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_metadata_gin 
ON uploaded_files USING gin (metadata);















