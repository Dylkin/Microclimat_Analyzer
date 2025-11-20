-- Создание таблицы audit_logs (упрощенная версия)
-- Выполните этот скрипт в Supabase SQL Editor

-- Создание таблицы для аудита действий пользователей
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- Включение RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Политика для чтения - только администраторы могут читать логи аудита
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = NULL 
            AND users.role IN ('admin', 'administrator')
        )
    );

-- Политика для вставки - все аутентифицированные пользователи могут создавать записи аудита
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    WITH CHECK (NULL IS NOT NULL);

-- Политика для обновления - запрещено (логи аудита неизменяемы)
CREATE POLICY "audit_logs_update_policy" ON public.audit_logs
    FOR UPDATE
    USING (false);

-- Политика для удаления - запрещено (логи аудита неизменяемы)
CREATE POLICY "audit_logs_delete_policy" ON public.audit_logs
    FOR DELETE
    USING (false);

-- Проверка создания таблицы
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Проверка количества записей (должно быть 0)
SELECT COUNT(*) as total_records FROM public.audit_logs;



















