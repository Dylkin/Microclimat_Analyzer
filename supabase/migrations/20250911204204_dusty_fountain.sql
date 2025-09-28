/*
  # Добавить документы к периодам испытаний

  1. Новые поля
    - `testing_period_documents` - таблица для хранения документов по испытаниям
    - Поля: id, testing_period_id, file_name, file_url, file_size, mime_type, uploaded_at

  2. Безопасность
    - Включить RLS для таблицы testing_period_documents
    - Добавить политики для аутентифицированных пользователей

  3. Связи
    - Внешний ключ на qualification_object_testing_periods
*/

-- Создаем таблицу для документов периодов испытаний
CREATE TABLE IF NOT EXISTS testing_period_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testing_period_id uuid NOT NULL REFERENCES qualification_object_testing_periods(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE testing_period_documents ENABLE ROW LEVEL SECURITY;

-- Создаем политику доступа для аутентифицированных пользователей
CREATE POLICY "Users can manage testing period documents"
  ON testing_period_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_testing_period_documents_testing_period_id 
  ON testing_period_documents(testing_period_id);

CREATE INDEX IF NOT EXISTS idx_testing_period_documents_uploaded_at 
  ON testing_period_documents(uploaded_at);