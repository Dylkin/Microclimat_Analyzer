-- Добавление полей для фиксации завершения и отмены этапов в таблицу qualification_work_schedule

-- Добавляем поля для хранения информации о завершении этапа
ALTER TABLE qualification_work_schedule 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN qualification_work_schedule.completed_at IS 'Дата и время завершения этапа';
COMMENT ON COLUMN qualification_work_schedule.completed_by IS 'ФИО пользователя, завершившего этап';
COMMENT ON COLUMN qualification_work_schedule.cancelled_at IS 'Дата и время отмены этапа';
COMMENT ON COLUMN qualification_work_schedule.cancelled_by IS 'ФИО пользователя, отменившего этап';

-- Создаем индекс для быстрого поиска по завершенным этапам
CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_completed 
ON qualification_work_schedule(qualification_object_id, is_completed, completed_at);

-- Обновляем существующие записи (если есть завершенные этапы без информации о завершении)
UPDATE qualification_work_schedule 
SET completed_at = updated_at, completed_by = 'Система'
WHERE is_completed = true AND completed_at IS NULL;

-- Выводим информацию о выполненных изменениях
SELECT 
    'Поля completed_at, completed_by, cancelled_at и cancelled_by успешно добавлены в таблицу qualification_work_schedule' as message,
    COUNT(*) as total_stages,
    COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_stages,
    COUNT(CASE WHEN cancelled_at IS NOT NULL THEN 1 END) as cancelled_stages
FROM qualification_work_schedule;
