/*
  # Создание таблицы пользователей

  1. Новые таблицы
    - `users`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `email` (text, unique)
      - `password` (text)
      - `role` (text)
      - `is_default` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS на таблице `users`
    - Добавить политики для аутентифицированных пользователей
    - Только администраторы могут управлять пользователями

  3. Данные по умолчанию
    - Создать пользователя-администратора по умолчанию
*/

-- Создание типа для ролей пользователей
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('administrator', 'specialist', 'manager', 'director');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создание таблицы пользователей
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

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Authenticated users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only administrators can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

CREATE POLICY "Only administrators can update users"
  ON users
  FOR UPDATE
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
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'administrator'
    ) AND is_default = false
  );

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставка пользователя по умолчанию
INSERT INTO users (id, full_name, email, password, role, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Дылкин П.А.',
  'pavel.dylkin@gmail.com',
  '00016346',
  'administrator',
  true
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  is_default = EXCLUDED.is_default;