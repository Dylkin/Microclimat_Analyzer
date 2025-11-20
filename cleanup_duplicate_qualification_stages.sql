-- Очистка дублирующихся этапов квалификационных работ
-- Этот скрипт удаляет дублирующиеся этапы и оставляет только 7 основных этапов

-- 1. Сначала удаляем этапы, которые не должны существовать (Проверка наличия документации, Документы по испытанию)
DELETE FROM public.qualification_work_schedule 
WHERE stage_name IN (
    'Проверка наличия документации',
    'Документы по испытанию'
);

-- 2. Удаляем дублирующиеся этапы, оставляя только один экземпляр каждого этапа для каждого объекта квалификации
WITH ranked_stages AS (
    SELECT 
        id,
        qualification_object_id,
        project_id,
        stage_name,
        ROW_NUMBER() OVER (
            PARTITION BY qualification_object_id, stage_name 
            ORDER BY created_at ASC
        ) as rn
    FROM public.qualification_work_schedule
)
DELETE FROM public.qualification_work_schedule 
WHERE id IN (
    SELECT id 
    FROM ranked_stages 
    WHERE rn > 1
);

-- 3. Проверяем результат
SELECT 
    qualification_object_id,
    project_id,
    stage_name,
    COUNT(*) as stage_count
FROM public.qualification_work_schedule
GROUP BY qualification_object_id, project_id, stage_name
ORDER BY qualification_object_id, stage_name;

-- 4. Показываем общую статистику
SELECT 
    'Общее количество этапов' as description,
    COUNT(*) as count
FROM public.qualification_work_schedule
UNION ALL
SELECT 
    'Уникальных объектов квалификации' as description,
    COUNT(DISTINCT qualification_object_id) as count
FROM public.qualification_work_schedule
UNION ALL
SELECT 
    'Уникальных проектов' as description,
    COUNT(DISTINCT project_id) as count
FROM public.qualification_work_schedule;



















