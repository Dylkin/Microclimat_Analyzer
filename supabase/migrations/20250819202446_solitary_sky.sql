/*
  # Безопасное обновление таблицы пользователей

  1. Проверяем и создаем недостающие элементы
    - Enum для ролей пользователей
    - Функция обновления updated_at
    - Триггер для автоматического обновления updated_at
    - Индексы для оптимизации
  
  2. Обновляем политики RLS
    - Разрешаем чтение всем аутентифицированным пользователям
    - Разрешаем модификацию только администраторам
    - Защищаем пользователей по умолчанию от удаления

  3. Добавляем пользователя по умолчанию если его нет
*/

-- Создаем enum для ролей если не существует
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('administrator', 'director', 'manager', 'specialist');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Создаем функцию обновления updated_at если не существует
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем таблицу users если не существует
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role user_role NOT NULL DEFAULT 'specialist',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем триггер если не существует
DO $$ BEGIN
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Создаем индексы если не существуют
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Включаем RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если существуют
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
DROP POLICY IF EXISTS "Only administrators can insert users" ON users;
DROP POLICY IF EXISTS "Only administrators can update users" ON users;
DROP POLICY IF EXISTS "Only administrators can delete users" ON users;

-- Создаем новые политики
CREATE POLICY "Authenticated users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only administrators can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

CREATE POLICY "Only administrators can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

CREATE POLICY "Only administrators can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
    AND is_default = false
  );

-- Добавляем пользователя по умолчанию если его нет
INSERT INTO users (id, full_name, email, password, role, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Дылкин П.А.',
  'pavel.dylkin@gmail.com',
  '00016346',
  'administrator',
  true
)
ON CONFLICT (email) DO NOTHING;