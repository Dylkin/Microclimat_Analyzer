-- Добавление геокоординат и тегов к контрагентам

-- Поле для широты
ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS latitude NUMERIC;

-- Поле для долготы
ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Поле даты геокодирования
ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Поле тегов (массив строк), если отсутствует
ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
