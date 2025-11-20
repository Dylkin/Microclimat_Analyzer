-- Добавление полей для периода проведения испытаний
-- Выполните эти команды в Supabase SQL Editor

-- 1. Добавление новых полей в таблицу testing_periods
ALTER TABLE testing_periods 
ADD COLUMN IF NOT EXISTS testing_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS testing_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Добавление комментариев к полям
COMMENT ON COLUMN testing_periods.testing_start_date IS 'Дата начала периода проведения испытаний';
COMMENT ON COLUMN testing_periods.testing_end_date IS 'Дата окончания периода проведения испытаний';

-- 3. Создание индексов для новых полей (опционально)
CREATE INDEX IF NOT EXISTS idx_testing_periods_testing_start_date ON testing_periods(testing_start_date);
CREATE INDEX IF NOT EXISTS idx_testing_periods_testing_end_date ON testing_periods(testing_end_date);

-- 4. Проверка структуры таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'testing_periods' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Проверка создания полей
SELECT 'Fields added successfully' as status;
SELECT 
  testing_start_date,
  testing_end_date,
  planned_start_date,
  planned_end_date,
  actual_start_date,
  actual_end_date
FROM testing_periods 
LIMIT 1;























