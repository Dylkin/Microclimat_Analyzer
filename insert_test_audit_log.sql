-- Создание тестовой записи аудита
-- Выполните этот скрипт после создания таблицы audit_logs

-- Вставляем тестовую запись аудита
INSERT INTO public.audit_logs (
    user_id,
    user_name,
    user_role,
    action,
    entity_type,
    entity_id,
    entity_name,
    details
) VALUES (
    NULL, -- ID текущего пользователя
    'Тестовый пользователь',
    'admin',
    'document_approved',
    'document',
    'test-doc-123',
    'Тестовый документ',
    '{"test": true, "documentType": "contract", "previousStatus": "pending", "newStatus": "approved"}'::jsonb
);

-- Проверяем, что запись создалась
SELECT 
    id,
    user_name,
    user_role,
    action,
    entity_type,
    entity_name,
    timestamp
FROM public.audit_logs 
ORDER BY timestamp DESC 
LIMIT 5;

-- Подсчитываем общее количество записей
SELECT COUNT(*) as total_records FROM public.audit_logs;



















