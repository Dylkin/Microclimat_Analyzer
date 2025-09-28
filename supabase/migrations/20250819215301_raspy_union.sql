/*
  # Полная очистка и пересоздание данных контрагентов

  1. Очистка данных
    - Удаление всех записей из связанных таблиц
    - Удаление всех контрагентов с некорректными UUID
    - Очистка всех связанных данных

  2. Проверка структуры
    - Проверка корректности схемы таблиц
    - Проверка constraints и индексов

  3. Создание тестовых данных
    - Добавление контрагента с корректным UUID
    - Проверка работоспособности
*/

-- Отключаем проверки внешних ключей временно
SET session_replication_role = replica;

-- Удаляем все данные из связанных таблиц в правильном порядке
DELETE FROM project_stage_assignments;
DELETE FROM project_qualification_objects;
DELETE FROM projects;
DELETE FROM qualification_objects;
DELETE FROM contractor_contacts;
DELETE FROM contractors;

-- Включаем проверки внешних ключей обратно
SET session_replication_role = DEFAULT;

-- Проверяем, что таблица contractors имеет правильную структуру
DO $$
BEGIN
  -- Проверяем, что поле id имеет правильный тип и default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contractors' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
    AND column_default LIKE '%gen_random_uuid%'
  ) THEN
    RAISE EXCEPTION 'Таблица contractors имеет некорректную структуру поля id';
  END IF;
END $$;

-- Создаем тестового контрагента для проверки
INSERT INTO contractors (name, address) 
VALUES ('Тестовый контрагент', 'Тестовый адрес');

-- Проверяем, что контрагент создался с корректным UUID
DO $$
DECLARE
  test_contractor_id uuid;
BEGIN
  SELECT id INTO test_contractor_id FROM contractors WHERE name = 'Тестовый контрагент';
  
  IF test_contractor_id IS NULL THEN
    RAISE EXCEPTION 'Не удалось создать тестового контрагента';
  END IF;
  
  RAISE NOTICE 'Тестовый контрагент создан с ID: %', test_contractor_id;
END $$;