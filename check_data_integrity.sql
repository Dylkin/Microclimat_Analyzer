-- Скрипт для проверки целостности данных в базе Microclimat Analyzer
-- Выполнить в Supabase SQL Editor

-- 1. Проверка "висячих" ссылок в projects
SELECT 
    'projects.contractor_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM projects p
LEFT JOIN contractors c ON p.contractor_id = c.id
WHERE c.id IS NULL;

-- 2. Проверка "висячих" ссылок в qualification_objects
SELECT 
    'qualification_objects.project_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM qualification_objects qo
LEFT JOIN projects p ON qo.project_id = p.id
WHERE p.id IS NULL;

-- 3. Проверка "висячих" ссылок в qualification_stages
SELECT 
    'qualification_stages.object_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM qualification_stages qs
LEFT JOIN qualification_objects qo ON qs.object_id = qo.id
WHERE qo.id IS NULL;

-- 4. Проверка "висячих" ссылок в project_qualification_objects
SELECT 
    'project_qualification_objects.project_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_qualification_objects pqo
LEFT JOIN projects p ON pqo.project_id = p.id
WHERE p.id IS NULL;

SELECT 
    'project_qualification_objects.qualification_object_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_qualification_objects pqo
LEFT JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
WHERE qo.id IS NULL;

-- 5. Проверка "висячих" ссылок в project_documents
SELECT 
    'project_documents.project_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_documents pd
LEFT JOIN projects p ON pd.project_id = p.id
WHERE p.id IS NULL;

SELECT 
    'project_documents.qualification_object_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_documents pd
LEFT JOIN qualification_objects qo ON pd.qualification_object_id = qo.id
WHERE pd.qualification_object_id IS NOT NULL AND qo.id IS NULL;

-- 6. Проверка "висячих" ссылок в qualification_object_testing_periods
SELECT 
    'qualification_object_testing_periods.qualification_object_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM qualification_object_testing_periods qotp
LEFT JOIN qualification_objects qo ON qotp.qualification_object_id = qo.id
WHERE qo.id IS NULL;

-- 7. Проверка "висячих" ссылок в project_equipment_assignments
SELECT 
    'project_equipment_assignments.project_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_equipment_assignments pea
LEFT JOIN projects p ON pea.project_id = p.id
WHERE p.id IS NULL;

SELECT 
    'project_equipment_assignments.qualification_object_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_equipment_assignments pea
LEFT JOIN qualification_objects qo ON pea.qualification_object_id = qo.id
WHERE qo.id IS NULL;

SELECT 
    'project_equipment_assignments.equipment_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM project_equipment_assignments pea
LEFT JOIN measurement_equipment me ON pea.equipment_id = me.id
WHERE me.id IS NULL;

-- 8. Проверка "висячих" ссылок в uploaded_files
SELECT 
    'uploaded_files.uploaded_by' AS table_column,
    COUNT(*) AS orphaned_records
FROM uploaded_files uf
LEFT JOIN public.users u ON uf.uploaded_by = u.id
WHERE uf.uploaded_by IS NOT NULL AND u.id IS NULL;

-- 9. Проверка "висячих" ссылок в audit_logs
SELECT 
    'audit_logs.user_id' AS table_column,
    COUNT(*) AS orphaned_records
FROM audit_logs al
LEFT JOIN public.users u ON al.user_id = u.id
WHERE u.id IS NULL;

-- 10. Проверка дублирующихся записей в project_qualification_objects
SELECT 
    project_id,
    qualification_object_id,
    COUNT(*) AS duplicate_count
FROM project_qualification_objects
GROUP BY project_id, qualification_object_id
HAVING COUNT(*) > 1;

-- 11. Проверка дублирующихся записей в project_equipment_assignments
SELECT 
    project_id,
    qualification_object_id,
    equipment_id,
    COUNT(*) AS duplicate_count
FROM project_equipment_assignments
GROUP BY project_id, qualification_object_id, equipment_id
HAVING COUNT(*) > 1;

-- 12. Проверка некорректных дат в qualification_object_testing_periods
SELECT 
    id,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date
FROM qualification_object_testing_periods
WHERE planned_end_date < planned_start_date
   OR (actual_start_date IS NOT NULL AND actual_end_date IS NOT NULL AND actual_end_date < actual_start_date);

-- 13. Проверка некорректных дат в qualification_stages
SELECT 
    id,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date
FROM qualification_stages
WHERE planned_end_date < planned_start_date
   OR (actual_start_date IS NOT NULL AND actual_end_date IS NOT NULL AND actual_end_date < actual_start_date);

-- 14. Проверка некорректных значений progress
SELECT 
    id,
    overall_progress
FROM qualification_objects
WHERE overall_progress < 0 OR overall_progress > 100;

-- 15. Проверка некорректных значений progress в projects
SELECT 
    id,
    progress
FROM projects
WHERE progress < 0 OR progress > 100;

-- 16. Проверка пустых обязательных полей
SELECT 
    'contractors.name' AS field,
    COUNT(*) AS empty_count
FROM contractors
WHERE name IS NULL OR name = '';

SELECT 
    'projects.name' AS field,
    COUNT(*) AS empty_count
FROM projects
WHERE name IS NULL OR name = '';

SELECT 
    'qualification_objects.type' AS field,
    COUNT(*) AS empty_count
FROM qualification_objects
WHERE type IS NULL;

-- 17. Проверка корректности JSON в technical_parameters
SELECT 
    id,
    technical_parameters
FROM qualification_objects
WHERE technical_parameters IS NOT NULL 
  AND NOT (technical_parameters::text ~ '^\{.*\}$' OR technical_parameters::text ~ '^\[.*\]$');

-- 18. Проверка корректности JSON в measurement_zones
SELECT 
    id,
    measurement_zones
FROM qualification_objects
WHERE measurement_zones IS NOT NULL 
  AND NOT (measurement_zones::text ~ '^\{.*\}$' OR measurement_zones::text ~ '^\[.*\]$');

-- 19. Проверка корректности JSON в audit_logs.details
SELECT 
    id,
    details
FROM audit_logs
WHERE details IS NOT NULL 
  AND NOT (details::text ~ '^\{.*\}$' OR details::text ~ '^\[.*\]$');

-- 20. Проверка корректности JSON в uploaded_files.metadata
SELECT 
    id,
    metadata
FROM uploaded_files
WHERE metadata IS NOT NULL 
  AND NOT (metadata::text ~ '^\{.*\}$' OR metadata::text ~ '^\[.*\]$');

-- 21. Проверка уникальности серийных номеров оборудования
SELECT 
    serial_number,
    COUNT(*) AS duplicate_count
FROM measurement_equipment
WHERE serial_number IS NOT NULL AND serial_number != ''
GROUP BY serial_number
HAVING COUNT(*) > 1;

-- 22. Проверка уникальности номеров договоров
SELECT 
    contract_number,
    COUNT(*) AS duplicate_count
FROM projects
WHERE contract_number IS NOT NULL AND contract_number != ''
GROUP BY contract_number
HAVING COUNT(*) > 1;

-- 23. Проверка корректности email адресов в contractors
SELECT 
    id,
    name,
    email
FROM contractors
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 24. Проверка корректности координат
SELECT 
    id,
    name,
    latitude,
    longitude
FROM contractors
WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
   OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180));

-- 25. Проверка размеров файлов
SELECT 
    id,
    file_name,
    file_size
FROM uploaded_files
WHERE file_size IS NOT NULL AND file_size <= 0;

-- 26. Проверка корректности URL файлов
SELECT 
    id,
    file_name,
    url
FROM uploaded_files
WHERE url IS NOT NULL 
  AND url != ''
  AND NOT (url ~ '^https?://' OR url ~ '^/');

-- 27. Проверка корректности URL в qualification_objects
SELECT 
    id,
    name,
    test_data_file_url
FROM qualification_objects
WHERE test_data_file_url IS NOT NULL 
  AND test_data_file_url != ''
  AND NOT (test_data_file_url ~ '^https?://' OR test_data_file_url ~ '^/');

-- 28. Проверка корректности URL в project_documents
SELECT 
    id,
    name,
    url
FROM project_documents
WHERE url IS NOT NULL 
  AND url != ''
  AND NOT (url ~ '^https?://' OR url ~ '^/');

-- 29. Проверка корректности IP адресов в audit_logs
SELECT 
    id,
    ip_address
FROM audit_logs
WHERE ip_address IS NOT NULL 
  AND NOT (ip_address::text ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' 
           OR ip_address::text ~ '^[0-9a-fA-F:]+$');

-- 30. Проверка корректности дат калибровки
SELECT 
    id,
    name,
    calibration_date
FROM measurement_equipment
WHERE calibration_date IS NOT NULL 
  AND calibration_date > CURRENT_DATE;















