-- Проверка структуры таблицы qualification_work_schedule
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'qualification_work_schedule' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверка данных в таблице qualification_work_schedule
SELECT 
    id,
    qualification_object_id,
    stage_name,
    stage_description,
    start_date,
    end_date,
    is_completed,
    completed_at,
    completed_by,
    cancelled_at,
    cancelled_by,
    created_at,
    updated_at
FROM public.qualification_work_schedule
ORDER BY qualification_object_id, created_at;

-- Проверка конкретного объекта квалификации (замените на нужный ID)
-- SELECT 
--     id,
--     qualification_object_id,
--     stage_name,
--     start_date,
--     end_date,
--     is_completed,
--     completed_at,
--     completed_by
-- FROM public.qualification_work_schedule
-- WHERE qualification_object_id = '8a648e8b-fa53-47fe-b2b1-69c9ec801ff7'
-- ORDER BY created_at;



















