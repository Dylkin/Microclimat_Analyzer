-- Создание таблицы для хранения отчетов анализа данных
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Создаем enum для типов отчетов
DO $$ BEGIN
    CREATE TYPE report_type AS ENUM ('template', 'analysis');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Создаем таблицу для отчетов анализа
CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  qualification_object_id UUID NOT NULL REFERENCES qualification_objects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type report_type NOT NULL DEFAULT 'analysis',
  report_url TEXT NOT NULL, -- URL для скачивания отчета
  report_filename TEXT NOT NULL, -- Имя файла отчета
  report_data JSONB NOT NULL, -- Данные отчета (анализ, маркеры, выводы и т.д.)
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_analysis_reports_project_id ON analysis_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_qualification_object_id ON analysis_reports(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_project_object ON analysis_reports(project_id, qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_by ON analysis_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON analysis_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_report_type ON analysis_reports(report_type);

-- 4. Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_analysis_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_analysis_reports_updated_at ON analysis_reports;
CREATE TRIGGER trigger_update_analysis_reports_updated_at
    BEFORE UPDATE ON analysis_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_analysis_reports_updated_at();

-- 6. Настраиваем RLS (Row Level Security)
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- 7. Создаем политики RLS
-- Пользователи могут видеть только отчеты проектов, к которым у них есть доступ
CREATE POLICY "Users can view reports for their accessible projects" ON analysis_reports
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = analysis_reports.project_id
        )
    );

-- Пользователи могут создавать отчеты для проектов, к которым у них есть доступ
CREATE POLICY "Users can create reports for their accessible projects" ON analysis_reports
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = analysis_reports.project_id
        ) AND created_by = NULL
    );

-- Пользователи могут обновлять только свои отчеты
CREATE POLICY "Users can update their own reports" ON analysis_reports
    FOR UPDATE USING (
        created_by = NULL AND
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = analysis_reports.project_id
        )
    );

-- Пользователи могут удалять только свои отчеты
CREATE POLICY "Users can delete their own reports" ON analysis_reports
    FOR DELETE USING (
        created_by = NULL AND
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = analysis_reports.project_id
        )
    );

-- 8. Добавляем комментарии к таблице и колонкам
COMMENT ON TABLE analysis_reports IS 'Таблица для хранения отчетов анализа данных микроклимата';
COMMENT ON COLUMN analysis_reports.project_id IS 'ID проекта квалификации';
COMMENT ON COLUMN analysis_reports.qualification_object_id IS 'ID объекта квалификации';
COMMENT ON COLUMN analysis_reports.report_name IS 'Название отчета';
COMMENT ON COLUMN analysis_reports.report_type IS 'Тип отчета: template (по шаблону) или analysis (анализ)';
COMMENT ON COLUMN analysis_reports.report_url IS 'URL для скачивания файла отчета';
COMMENT ON COLUMN analysis_reports.report_filename IS 'Имя файла отчета';
COMMENT ON COLUMN analysis_reports.report_data IS 'JSON данные отчета (анализ, маркеры, выводы, настройки)';
COMMENT ON COLUMN analysis_reports.created_by IS 'ID пользователя, создавшего отчет';
COMMENT ON COLUMN analysis_reports.created_at IS 'Дата и время создания отчета';
COMMENT ON COLUMN analysis_reports.updated_at IS 'Дата и время последнего обновления отчета';

-- 9. Создаем представление для удобного просмотра отчетов с дополнительной информацией
CREATE OR REPLACE VIEW analysis_reports_view AS
SELECT 
    ar.id,
    ar.project_id,
    p.name as project_name,
    p.contract_number,
    ar.qualification_object_id,
    qo.name as qualification_object_name,
    qo.type as qualification_object_type,
    ar.report_name,
    ar.report_type,
    ar.report_url,
    ar.report_filename,
    ar.report_data,
    ar.created_by,
    u.email as created_by_email,
    ar.created_at,
    ar.updated_at
FROM analysis_reports ar
LEFT JOIN projects p ON ar.project_id = p.id
LEFT JOIN qualification_objects qo ON ar.qualification_object_id = qo.id
LEFT JOIN public.users u ON ar.created_by = u.id;

-- 10. Добавляем комментарий к представлению
COMMENT ON VIEW analysis_reports_view IS 'Представление отчетов анализа с дополнительной информацией о проектах и объектах квалификации';

-- Проверяем создание таблицы
SELECT 'Таблица analysis_reports успешно создана' as status;










