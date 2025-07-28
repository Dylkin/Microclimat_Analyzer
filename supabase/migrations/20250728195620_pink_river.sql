/*
  # Создание системы пользователей (исправленная версия)

  1. Новые типы
    - `user_role` enum с ролями: administrator, manager, specialist

  2. Новые таблицы
    - `users`
      - `id` (uuid, primary key, связан с auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (user_role, по умолчанию specialist)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  3. Безопасность
    - Включен RLS для таблицы users
    - Политики для чтения и управления пользователями
    - Триггер для обновления updated_at

  4. Данные по умолчанию
    - Создание администратора по умолчанию через auth.users
*/

-- Создание типа роли (если не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('administrator', 'manager', 'specialist');
    END IF;
END $$;

-- Создание функции для обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Удаление существующих политик (если есть)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Создание политик RLS
CREATE POLICY "Users can read own data"
    ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
    ON users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'administrator'
        )
    );

CREATE POLICY "Admins can manage all users"
    ON users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'administrator'
        )
    );

-- Создание триггера для updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Создание администратора по умолчанию
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Проверяем, существует ли уже пользователь с таким email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'pavel.dylkin@gmail.com';
    
    -- Если пользователь не существует, создаем его
    IF admin_user_id IS NULL THEN
        -- Создаем пользователя в auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'pavel.dylkin@gmail.com',
            crypt('00016346', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO admin_user_id;
        
        -- Создаем профиль пользователя
        INSERT INTO users (id, email, full_name, role)
        VALUES (
            admin_user_id,
            'pavel.dylkin@gmail.com',
            'Дылкин П.А.',
            'administrator'
        );
    ELSE
        -- Если пользователь существует, обновляем его профиль
        INSERT INTO users (id, email, full_name, role)
        VALUES (
            admin_user_id,
            'pavel.dylkin@gmail.com',
            'Дылкин П.А.',
            'administrator'
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    END IF;
END $$;