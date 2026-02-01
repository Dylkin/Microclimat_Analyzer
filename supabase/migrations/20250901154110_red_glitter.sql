/*
  # Создание правильных RLS политик для uploaded_files

  1. Безопасность
    - Удаляем все существующие политики для uploaded_files
    - Создаем новые политики с корректной логикой аутентификации
    - Обеспечиваем доступ пользователей только к своим файлам

  2. Политики
    - INSERT: пользователи могут вставлять только свои файлы
    - SELECT: пользователи могут читать только свои файлы  
    - UPDATE: пользователи могут обновлять только свои файлы
    - DELETE: пользователи могут удалять только свои файлы
*/

-- Удаляем все существующие политики для таблицы uploaded_files
DROP POLICY IF EXISTS "uploaded_files_insert_own" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_select_own" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_update_own" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_delete_own" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can view their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_auth_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_public_access" ON uploaded_files;

-- Разрешить аутентифицированным пользователям вставлять свои файлы
CREATE POLICY "Users can insert their own files"
ON uploaded_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Разрешить пользователям читать свои файлы
CREATE POLICY "Users can view their own files"
ON uploaded_files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Разрешить пользователям обновлять свои файлы
CREATE POLICY "Users can update their own files"
ON uploaded_files
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Разрешить пользователям удалять свои файлы
CREATE POLICY "Users can delete their own files"
ON uploaded_files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);