/*
  # Создание таблицы пользователей

  1. Новые таблицы
    - `users`
      - `id` (uuid, primary key) - связь с auth.users
      - `email` (text, unique) - email пользователя
      - `full_name` (text) - полное имя пользователя
      - `role` (enum) - роль пользователя (administrator, manager, specialist)
      - `created_at` (timestamp) - дата создания
      - `updated_at` (timestamp) - дата обновления

  2. Безопасность
    - Включить RLS для таблицы users
    - Политики для чтения и управления пользователями
    - Ограничение на одного руководителя через триггер

  3. Данные по умолчанию
    - Создание пользователя по умолчанию: Дылкин П.А.
*/

-- Создание типа для ролей пользователей
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

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Пользователи могут читать свои данные"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Администраторы и руководители могут читать всех пользователей"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'manager')
    )
  );

CREATE POLICY "Администраторы могут управлять пользователями"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
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

-- Функция для проверки ограничения на одного руководителя
CREATE OR REPLACE FUNCTION check_single_manager()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'manager' THEN
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE role = 'manager' 
      AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Роль Руководитель может быть присвоена только одному сотруднику';
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

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);