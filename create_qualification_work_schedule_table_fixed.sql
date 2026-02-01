-- Создание таблицы для хранения расписания квалификационных работ
CREATE TABLE IF NOT EXISTS qualification_work_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_object_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  stage_description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Внешний ключ на таблицу qualification_objects
  CONSTRAINT fk_qualification_work_schedule_object 
    FOREIGN KEY (qualification_object_id) 
    REFERENCES qualification_objects(id) 
    ON DELETE CASCADE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_object_id 
  ON qualification_work_schedule(qualification_object_id);

CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_dates 
  ON qualification_work_schedule(start_date, end_date);

-- Создание триггера для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_qualification_work_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qualification_work_schedule_updated_at
  BEFORE UPDATE ON qualification_work_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_qualification_work_schedule_updated_at();

-- Включение RLS (Row Level Security)
ALTER TABLE qualification_work_schedule ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
-- Просмотр всех записей
CREATE POLICY "Users can view all work schedules" ON qualification_work_schedule 
FOR SELECT USING (true);

-- Добавление записей авторизованными пользователями
CREATE POLICY "Authenticated users can insert work schedules" ON qualification_work_schedule 
FOR INSERT WITH CHECK (true = 'authenticated');

-- Обновление записей авторизованными пользователями
CREATE POLICY "Authenticated users can update work schedules" ON qualification_work_schedule 
FOR UPDATE USING (true = 'authenticated');

-- Удаление записей авторизованными пользователями
CREATE POLICY "Authenticated users can delete work schedules" ON qualification_work_schedule 
FOR DELETE USING (true = 'authenticated');

-- Комментарии к таблице и полям
COMMENT ON TABLE qualification_work_schedule IS 'Расписание квалификационных работ для объектов квалификации';
COMMENT ON COLUMN qualification_work_schedule.qualification_object_id IS 'ID объекта квалификации';
COMMENT ON COLUMN qualification_work_schedule.stage_name IS 'Название этапа квалификационных работ';
COMMENT ON COLUMN qualification_work_schedule.stage_description IS 'Описание этапа квалификационных работ';
COMMENT ON COLUMN qualification_work_schedule.start_date IS 'Дата начала этапа';
COMMENT ON COLUMN qualification_work_schedule.end_date IS 'Дата окончания этапа';
COMMENT ON COLUMN qualification_work_schedule.is_completed IS 'Статус завершения этапа';























