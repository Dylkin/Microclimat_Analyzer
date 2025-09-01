/*
  # Пошаговое исправление RLS политик для uploaded_files

  1. Удаление всех существующих политик
  2. Проверка и исправление типа колонки user_id
  3. Добавление внешнего ключа на auth.users
  4. Создание правильных RLS политик
*/

-- Шаг 1: Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can delete their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can view their own files" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_insert_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_select_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_update_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_delete_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_public_policy" ON uploaded_files;

-- Шаг 2: Убеждаемся, что user_id имеет тип uuid
DO $$
BEGIN
  -- Проверяем текущий тип колонки user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'uploaded_files' 
    AND column_name = 'user_id' 
    AND data_type != 'uuid'
  ) THEN
    -- Изменяем тип на uuid если он не uuid
    ALTER TABLE uploaded_files 
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;
END $$;

-- Шаг 3: Добавляем внешний ключ на auth.users если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'uploaded_files_user_id_fkey'
    AND table_name = 'uploaded_files'
  ) THEN
    ALTER TABLE uploaded_files
    ADD CONSTRAINT uploaded_files_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Шаг 4: Создаем правильные RLS политики

-- SELECT: пользователи могут читать только свои файлы
CREATE POLICY "read own files"
ON uploaded_files
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: пользователи могут вставлять только файлы со своим user_id
CREATE POLICY "insert own files"
ON uploaded_files
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: пользователи могут обновлять только свои файлы (нужно для upsert)
CREATE POLICY "update own files"
ON uploaded_files
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: пользователи могут удалять только свои файлы
CREATE POLICY "delete own files"
ON uploaded_files
FOR DELETE
TO authenticated
USING (user_id = auth.uid());