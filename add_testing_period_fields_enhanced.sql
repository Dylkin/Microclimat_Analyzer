-- Добавление полей для периода проведения испытаний в таблицу qualification_object_testing_periods
-- Эти поля позволяют указать конкретный период проведения испытаний в днях

-- Добавляем новые колонки для периода проведения испытаний
ALTER TABLE qualification_object_testing_periods
ADD COLUMN IF NOT EXISTS testing_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS testing_end_date TIMESTAMP WITH TIME ZONE;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN qualification_object_testing_periods.testing_start_date IS 'Дата начала периода проведения испытаний';
COMMENT ON COLUMN qualification_object_testing_periods.testing_end_date IS 'Дата окончания периода проведения испытаний';

-- Создаем индексы для оптимизации запросов по новым полям
CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_testing_start_date 
ON qualification_object_testing_periods(testing_start_date);

CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_testing_end_date 
ON qualification_object_testing_periods(testing_end_date);

-- Создаем составной индекс для поиска по периоду проведения испытаний
CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_testing_period 
ON qualification_object_testing_periods(testing_start_date, testing_end_date);

-- Добавляем проверочное ограничение для валидации дат
ALTER TABLE qualification_object_testing_periods
ADD CONSTRAINT IF NOT EXISTS check_testing_dates_valid 
CHECK (
  testing_start_date IS NULL OR 
  testing_end_date IS NULL OR 
  testing_start_date <= testing_end_date
);

-- Добавляем проверочное ограничение для соответствия планируемым датам
ALTER TABLE qualification_object_testing_periods
ADD CONSTRAINT IF NOT EXISTS check_testing_dates_within_planned 
CHECK (
  testing_start_date IS NULL OR 
  testing_end_date IS NULL OR 
  planned_start_date IS NULL OR 
  planned_end_date IS NULL OR
  (testing_start_date >= planned_start_date AND testing_end_date <= planned_end_date)
);

-- Проверяем создание колонок
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'qualification_object_testing_periods' 
AND column_name IN ('testing_start_date', 'testing_end_date')
ORDER BY column_name;

-- Проверяем создание индексов
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'qualification_object_testing_periods' 
AND indexname LIKE '%testing%'
ORDER BY indexname;

-- Проверяем создание ограничений
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'qualification_object_testing_periods'::regclass 
AND conname LIKE '%testing%'
ORDER BY conname;

-- Выводим сообщение об успешном выполнении
SELECT 'Поля для периода проведения испытаний успешно добавлены в таблицу qualification_object_testing_periods' as status;























