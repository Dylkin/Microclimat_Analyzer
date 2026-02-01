-- Создание таблицы для аудита действий пользователей
CREATE TABLE IF NOT EXISTS public.audit_logs (
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- Включение RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Политика для чтения - только администраторы могут читать логи аудита
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'administrator')
        )
    );

-- Политика для вставки - все аутентифицированные пользователи могут создавать записи аудита
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Политика для обновления - запрещено (логи аудита неизменяемы)
CREATE POLICY "audit_logs_update_policy" ON public.audit_logs
    FOR UPDATE
    USING (false);

-- Политика для удаления - запрещено (логи аудита неизменяемы)
CREATE POLICY "audit_logs_delete_policy" ON public.audit_logs
    FOR DELETE
    USING (false);

-- Комментарии к таблице и столбцам
COMMENT ON TABLE public.audit_logs IS 'Таблица для аудита действий пользователей в системе';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID пользователя, выполнившего действие';
COMMENT ON COLUMN public.audit_logs.user_name IS 'Имя пользователя на момент выполнения действия';
COMMENT ON COLUMN public.audit_logs.user_role IS 'Роль пользователя на момент выполнения действия';
COMMENT ON COLUMN public.audit_logs.action IS 'Тип выполненного действия';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Тип сущности, с которой выполнялось действие';
COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID сущности, с которой выполнялось действие';
COMMENT ON COLUMN public.audit_logs.entity_name IS 'Название сущности (опционально)';
COMMENT ON COLUMN public.audit_logs.details IS 'Дополнительные детали действия в формате JSON';
COMMENT ON COLUMN public.audit_logs.timestamp IS 'Время выполнения действия';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP адрес пользователя';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User Agent браузера пользователя';



















