-- Добавление поля project_id в таблицу qualification_work_schedule
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем поле project_id в таблицу qualification_work_schedule
ALTER TABLE qualification_work_schedule 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- 2. Создаем индекс для оптимизации запросов по project_id
CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_project_id 
ON qualification_work_schedule(project_id);

-- 3. Создаем составной индекс для оптимизации запросов по project_id и qualification_object_id
CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_project_object 
ON qualification_work_schedule(project_id, qualification_object_id);

-- 4. Обновляем RLS политики для учета project_id
-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view work schedules for their accessible projects" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Users can create work schedules for their accessible projects" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Users can update work schedules for their accessible projects" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Users can delete work schedules for their accessible projects" ON qualification_work_schedule;

-- Создаем новые политики с учетом project_id
CREATE POLICY "Users can view work schedules for their accessible projects" ON qualification_work_schedule
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = qualification_work_schedule.project_id
        )
    );

CREATE POLICY "Users can create work schedules for their accessible projects" ON qualification_work_schedule
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = qualification_work_schedule.project_id
        )
    );

CREATE POLICY "Users can update work schedules for their accessible projects" ON qualification_work_schedule
    FOR UPDATE USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = qualification_work_schedule.project_id
        )
    );

CREATE POLICY "Users can delete work schedules for their accessible projects" ON qualification_work_schedule
    FOR DELETE USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.id = qualification_work_schedule.project_id
        )
    );

-- 5. Добавляем комментарий к новому полю
COMMENT ON COLUMN qualification_work_schedule.project_id IS 'ID проекта квалификации, к которому привязано расписание';

-- 6. Создаем представление для удобного просмотра расписания с информацией о проекте
CREATE OR REPLACE VIEW qualification_work_schedule_view AS
SELECT 
    qws.id,
    qws.qualification_object_id,
    qo.name as qualification_object_name,
    qo.type as qualification_object_type,
    qws.project_id,
    p.name as project_name,
    p.contract_number,
    qws.stage_name,
    qws.stage_description,
    qws.start_date,
    qws.end_date,
    qws.is_completed,
    qws.completed_at,
    qws.completed_by,
    qws.cancelled_at,
    qws.cancelled_by,
    qws.created_at,
    qws.updated_at
FROM qualification_work_schedule qws
LEFT JOIN qualification_objects qo ON qws.qualification_object_id = qo.id
LEFT JOIN projects p ON qws.project_id = p.id;

-- 7. Добавляем комментарий к представлению
COMMENT ON VIEW qualification_work_schedule_view IS 'Представление расписания квалификационных работ с дополнительной информацией о проектах и объектах';

-- Проверяем добавление поля
SELECT 'Поле project_id успешно добавлено в таблицу qualification_work_schedule' as status;