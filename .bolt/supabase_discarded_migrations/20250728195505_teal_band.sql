/*
  # Безопасное создание системы пользователей

  1. Проверка и создание типа user_role
  2. Проверка и создание таблицы users
  3. Настройка RLS политик
  4. Создание пользователя по умолчанию
*/

-- Создаем тип user_role только если он не существует
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('administrator', 'manager', 'specialist');
    END IF;
END $$;

-- Создаем таблицу users только если она не существует
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'specialist',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Создаем политики RLS
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::uuid OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid()::uuid AND u.role = 'administrator'
  ));

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::uuid OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid()::uuid AND u.role = 'administrator'
  ));

CREATE POLICY "Admins can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid()::uuid AND u.role = 'administrator'
  ));

CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid()::uuid AND u.role = 'administrator'
  ));

-- Создаем функцию для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Создаем пользователя по умолчанию (администратора)
INSERT INTO users (email, full_name, password_hash, role)
VALUES (
  'pavel.dylkin@gmail.com',
  'Дылкин П.А.',
  '$2b$10$rQZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ9vZ',
  'administrator'
) ON CONFLICT (email) DO NOTHING;

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);