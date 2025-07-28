/*
  # Создание системы пользователей

  1. Новые таблицы
    - `users`
      - `id` (uuid, primary key, связан с auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (enum: administrator, manager, specialist)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы `users`
    - Политики для чтения и управления пользователями
    - Ограничение на одного руководителя

  3. Функции
    - Функция для обновления updated_at
    - Функция для проверки единственности руководителя
*/

-- Создание типа для ролей
CREATE TYPE user_role AS ENUM ('administrator', 'manager', 'specialist');

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'specialist',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Функция для проверки единственности руководителя
CREATE OR REPLACE FUNCTION check_single_manager()
RETURNS TRIGGER AS $$
BEGIN
  -- Если назначается роль руководителя
  IF NEW.role = 'manager' THEN
    -- Проверяем, есть ли уже руководитель (исключая текущего пользователя при обновлении)
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE role = 'manager' 
      AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Роль руководителя может быть присвоена только одному сотруднику';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для проверки единственности руководителя
CREATE TRIGGER check_single_manager_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_single_manager();

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Администраторы могут управлять всеми пользователями"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'administrator'
    )
  );

CREATE POLICY "Руководители могут читать всех пользователей"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role IN ('administrator', 'manager')
    )
  );

CREATE POLICY "Пользователи могут читать свои данные"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Пользователи могут обновлять свои данные"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);