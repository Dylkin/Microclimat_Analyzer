-- Создание таблиц для хранения данных логгеров

-- Таблица для сводной информации о файлах логгеров
CREATE TABLE IF NOT EXISTS logger_data_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    qualification_object_id UUID NOT NULL,
    zone_number INTEGER NOT NULL,
    measurement_level INTEGER NOT NULL,
    logger_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    device_type INTEGER NOT NULL,
    device_model TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    parsing_status TEXT NOT NULL DEFAULT 'processing' CHECK (parsing_status IN ('processing', 'completed', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для детальных записей измерений логгеров
CREATE TABLE IF NOT EXISTS logger_data_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    qualification_object_id UUID NOT NULL,
    zone_number INTEGER NOT NULL,
    measurement_level INTEGER NOT NULL,
    logger_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    device_type INTEGER NOT NULL,
    device_model TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature DECIMAL(10,2) NOT NULL,
    humidity DECIMAL(5,2),
    is_valid BOOLEAN NOT NULL DEFAULT true,
    validation_errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_logger_data_summary_project_object 
    ON logger_data_summary(project_id, qualification_object_id);

CREATE INDEX IF NOT EXISTS idx_logger_data_summary_zone_level 
    ON logger_data_summary(zone_number, measurement_level);

CREATE INDEX IF NOT EXISTS idx_logger_data_summary_parsing_status 
    ON logger_data_summary(parsing_status);

CREATE INDEX IF NOT EXISTS idx_logger_data_records_project_object 
    ON logger_data_records(project_id, qualification_object_id);

CREATE INDEX IF NOT EXISTS idx_logger_data_records_zone_level 
    ON logger_data_records(zone_number, measurement_level);

CREATE INDEX IF NOT EXISTS idx_logger_data_records_timestamp 
    ON logger_data_records(timestamp);

CREATE INDEX IF NOT EXISTS idx_logger_data_records_logger_name 
    ON logger_data_records(logger_name);

-- Создание индекса для составных запросов по проекту, объекту, зоне и уровню
CREATE INDEX IF NOT EXISTS idx_logger_data_records_composite 
    ON logger_data_records(project_id, qualification_object_id, zone_number, measurement_level, timestamp);

-- Создание триггера для автоматического обновления updated_at в logger_data_summary
CREATE OR REPLACE FUNCTION update_logger_data_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_logger_data_summary_updated_at
    BEFORE UPDATE ON logger_data_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_logger_data_summary_updated_at();

-- Создание RLS политик для безопасности данных
ALTER TABLE logger_data_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data_records ENABLE ROW LEVEL SECURITY;

-- Политика для logger_data_summary - разрешаем все операции для аутентифицированных пользователей
CREATE POLICY "Allow all operations for authenticated users" ON logger_data_summary
    FOR ALL USING (true);

-- Политика для logger_data_records - разрешаем все операции для аутентифицированных пользователей
CREATE POLICY "Allow all operations for authenticated users" ON logger_data_records
    FOR ALL USING (true);

-- Комментарии к таблицам
COMMENT ON TABLE logger_data_summary IS 'Сводная информация о загруженных файлах данных логгеров';
COMMENT ON TABLE logger_data_records IS 'Детальные записи измерений логгеров для анализа временных рядов';

-- Комментарии к ключевым полям
COMMENT ON COLUMN logger_data_summary.project_id IS 'ID проекта (связь с таблицей проектов)';
COMMENT ON COLUMN logger_data_summary.qualification_object_id IS 'ID объекта квалификации';
COMMENT ON COLUMN logger_data_summary.zone_number IS 'Номер зоны измерения';
COMMENT ON COLUMN logger_data_summary.measurement_level IS 'Уровень измерения в зоне';
COMMENT ON COLUMN logger_data_summary.logger_name IS 'Название логгера';
COMMENT ON COLUMN logger_data_summary.device_type IS 'Тип устройства (1 - одноканальный, 2 - двухканальный)';
COMMENT ON COLUMN logger_data_summary.parsing_status IS 'Статус обработки файла';

COMMENT ON COLUMN logger_data_records.temperature IS 'Температура в градусах Цельсия';
COMMENT ON COLUMN logger_data_records.humidity IS 'Влажность в процентах (для двухканальных устройств)';
COMMENT ON COLUMN logger_data_records.is_valid IS 'Флаг валидности записи';
COMMENT ON COLUMN logger_data_records.validation_errors IS 'Массив ошибок валидации записи';

-- Создание представления для удобного анализа данных логгеров
-- (создается после создания всех таблиц)
CREATE OR REPLACE VIEW logger_data_analysis AS
SELECT 
    lds.id as summary_id,
    lds.project_id,
    lds.qualification_object_id,
    lds.zone_number,
    lds.measurement_level,
    lds.logger_name,
    lds.file_name,
    lds.device_type,
    lds.device_model,
    lds.serial_number,
    lds.start_date,
    lds.end_date,
    lds.record_count,
    lds.parsing_status,
    lds.error_message,
    lds.created_at as file_uploaded_at,
    -- Статистика по измерениям
    COUNT(ldr.id) as actual_record_count,
    MIN(ldr.timestamp) as actual_start_date,
    MAX(ldr.timestamp) as actual_end_date,
    AVG(ldr.temperature) as avg_temperature,
    MIN(ldr.temperature) as min_temperature,
    MAX(ldr.temperature) as max_temperature,
    AVG(ldr.humidity) as avg_humidity,
    MIN(ldr.humidity) as min_humidity,
    MAX(ldr.humidity) as max_humidity,
    COUNT(CASE WHEN ldr.is_valid = false THEN 1 END) as invalid_record_count
FROM logger_data_summary lds
LEFT JOIN logger_data_records ldr ON (
    lds.project_id = ldr.project_id AND
    lds.qualification_object_id = ldr.qualification_object_id AND
    lds.zone_number = ldr.zone_number AND
    lds.measurement_level = ldr.measurement_level AND
    lds.file_name = ldr.file_name
)
GROUP BY lds.id, lds.project_id, lds.qualification_object_id, lds.zone_number, 
         lds.measurement_level, lds.logger_name, lds.file_name, lds.device_type,
         lds.device_model, lds.serial_number, lds.start_date, lds.end_date,
         lds.record_count, lds.parsing_status, lds.error_message, lds.created_at;

-- Комментарий к представлению
COMMENT ON VIEW logger_data_analysis IS 'Представление для анализа данных логгеров с агрегированной статистикой';
