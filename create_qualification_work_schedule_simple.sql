-- Простое создание таблицы для хранения расписания квалификационных работ
CREATE TABLE IF NOT EXISTS qualification_work_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_object_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  stage_description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Внешний ключ (выполнить отдельно, если таблица qualification_objects существует)
-- ALTER TABLE qualification_work_schedule 
-- ADD CONSTRAINT fk_qualification_work_schedule_object 
-- FOREIGN KEY (qualification_object_id) 
-- REFERENCES qualification_objects(id) 
-- ON DELETE CASCADE;

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_object_id 
  ON qualification_work_schedule(qualification_object_id);

-- Включение RLS
ALTER TABLE qualification_work_schedule ENABLE ROW LEVEL SECURITY;

-- Базовая политика для просмотра
CREATE POLICY "Users can view all work schedules" ON qualification_work_schedule 
FOR SELECT USING (true);

-- Политика для вставки
CREATE POLICY "Authenticated users can insert work schedules" ON qualification_work_schedule 
FOR INSERT WITH CHECK (true = 'authenticated');

-- Политика для обновления
CREATE POLICY "Authenticated users can update work schedules" ON qualification_work_schedule 
FOR UPDATE USING (true = 'authenticated');

-- Политика для удаления
CREATE POLICY "Authenticated users can delete work schedules" ON qualification_work_schedule 
FOR DELETE USING (true = 'authenticated');























