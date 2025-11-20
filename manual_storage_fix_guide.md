# Руководство по исправлению Supabase Storage

## Проблема
- Ошибка: "Недостаточно прав для загрузки в bucket 'documents'"
- Ошибка: "must be owner of table objects"
- RPC недоступен
- Не удается получить доступ к таблицам storage.buckets

## Решение

### Шаг 1: Откройте Supabase Dashboard
1. Перейдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor**

### Шаг 2: Выполните SQL скрипт
Скопируйте и выполните следующий SQL скрипт:

```sql
-- Исправление прав доступа к Supabase Storage
-- Выполните этот скрипт в SQL Editor

-- 1. Предоставляем права на чтение таблицы storage.buckets
GRANT SELECT ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- 2. Предоставляем права на работу с таблицей storage.objects
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon;

-- 3. Создаем или обновляем bucket documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff'
  ];

-- 4. Создаем или обновляем bucket qualification-objects
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qualification-objects',
  'qualification-objects',
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm'
  ];

-- 5. Настраиваем RLS политики
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow file uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow file downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow file updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow file deletions" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous file uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous file downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous access" ON storage.objects;

-- Создаем новые политики для аутентифицированных пользователей
CREATE POLICY "Allow all operations for authenticated users" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- Создаем политики для анонимных пользователей
CREATE POLICY "Allow anonymous access" ON storage.objects
FOR ALL TO anon
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- 6. Проверяем результат
SELECT 'Storage исправлен успешно!' as message;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('qualification-objects', 'documents');
```

### Шаг 3: Проверьте результат
После выполнения скрипта вы должны увидеть:
- Сообщение "Storage исправлен успешно!"
- Список buckets с их настройками

### Шаг 4: Обновите страницу
1. Обновите страницу в браузере (F5)
2. Попробуйте загрузить файл снова

## Альтернативное решение (если вышеуказанное не работает)

### Вариант 1: Используйте публичные buckets
Если проблема с правами доступа продолжается, убедитесь, что buckets настроены как публичные:

```sql
-- Делаем buckets публичными
UPDATE storage.buckets SET public = true WHERE id = 'documents';
UPDATE storage.buckets SET public = true WHERE id = 'qualification-objects';
```

### Вариант 2: Проверьте настройки проекта
1. В Supabase Dashboard перейдите в **Settings** → **API**
2. Убедитесь, что **Row Level Security** включен
3. Проверьте, что **Service Role Key** правильно настроен

### Вариант 3: Создайте новые buckets
Если существующие buckets повреждены:

```sql
-- Удаляем старые buckets (ОСТОРОЖНО: это удалит все файлы!)
DELETE FROM storage.buckets WHERE id IN ('documents', 'qualification-objects');

-- Создаем новые buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('documents', 'documents', true),
('qualification-objects', 'qualification-objects', true);
```

## Проверка работы
После выполнения исправлений:
1. Откройте инструмент "Storage Diagnostic"
2. Нажмите "Запустить диагностику"
3. Все пункты должны быть отмечены зелеными галочками

## Поддержка
Если проблема не решается:
1. Проверьте логи в Supabase Dashboard → Logs
2. Убедитесь, что у вас есть права администратора проекта
3. Обратитесь в поддержку Supabase