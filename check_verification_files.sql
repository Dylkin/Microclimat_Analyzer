-- Проверка файлов свидетельств о поверке в базе данных

-- 1. Общая статистика по верификациям
SELECT 
    COUNT(*) as total_verifications,
    COUNT(verification_file_url) as verifications_with_file_url,
    COUNT(CASE WHEN verification_file_url IS NOT NULL AND verification_file_url != '' THEN 1 END) as verifications_with_non_empty_url,
    COUNT(CASE WHEN verification_file_url LIKE 'blob:%' THEN 1 END) as verifications_with_blob_url,
    COUNT(CASE WHEN verification_file_url LIKE '/uploads/%' OR verification_file_url LIKE 'http%' THEN 1 END) as verifications_with_server_url
FROM equipment_verifications;

-- 2. Детальная информация по всем верификациям с файлами
SELECT 
    ev.id,
    me.name as equipment_name,
    me.serial_number,
    ev.verification_start_date,
    ev.verification_end_date,
    ev.verification_file_url,
    ev.verification_file_name,
    CASE 
        WHEN ev.verification_file_url IS NULL OR ev.verification_file_url = '' THEN 'Нет файла'
        WHEN ev.verification_file_url LIKE 'blob:%' THEN '⚠️ Blob URL (недействителен)'
        WHEN ev.verification_file_url LIKE '/uploads/%' THEN '✅ Серверный URL'
        WHEN ev.verification_file_url LIKE 'http%' THEN '✅ HTTP URL'
        ELSE '❓ Неизвестный формат'
    END as file_status,
    ev.created_at
FROM equipment_verifications ev
LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
ORDER BY ev.created_at DESC;

-- 3. Оборудование с blob URL (требует перезагрузки файлов)
SELECT 
    me.name as equipment_name,
    me.serial_number,
    ev.verification_file_url,
    ev.verification_file_name,
    ev.verification_start_date,
    ev.verification_end_date
FROM equipment_verifications ev
LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
WHERE ev.verification_file_url LIKE 'blob:%'
ORDER BY me.name;

-- 4. Оборудование с серверными URL (файлы загружены на сервер)
SELECT 
    me.name as equipment_name,
    me.serial_number,
    ev.verification_file_url,
    ev.verification_file_name,
    ev.verification_start_date,
    ev.verification_end_date
FROM equipment_verifications ev
LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
WHERE ev.verification_file_url LIKE '/uploads/%' OR ev.verification_file_url LIKE 'http%'
ORDER BY me.name;

-- 5. Оборудование без файлов верификации
SELECT 
    me.name as equipment_name,
    me.serial_number,
    ev.verification_start_date,
    ev.verification_end_date
FROM equipment_verifications ev
LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
WHERE ev.verification_file_url IS NULL OR ev.verification_file_url = ''
ORDER BY me.name;
