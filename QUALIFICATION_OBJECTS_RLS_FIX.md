# Исправление ошибки RLS политики для qualification-objects

## Проблема
При загрузке файлов планов объектов квалификации возникает ошибка:
```
POST https://rcplxggzlkqsypffugno.supabase.co/storage/v1/object/qualification-objects/plans/... 400 (Bad Request)
Ошибка загрузки файла плана: Error: Ошибка загрузки файла плана: new row violates row-level security policy
```

## Причина
1. **Отсутствие RLS политик**: Для bucket `qualification-objects` не настроены политики безопасности на уровне строк (RLS)
2. **Несовместимость аутентификации**: Приложение использует собственную систему аутентификации, но Supabase Storage требует аутентификации через Supabase Auth

## Решение

### Вариант 1: Публичные политики (рекомендуется для разработки)

Выполните SQL команды из файла `disable_rls_qualification_objects.sql`:

```sql
-- 1. Создание bucket qualification-objects
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qualification-objects',
  'qualification-objects',
  true,  -- Публичный bucket
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];

-- 2. Создание публичных политик
CREATE POLICY "Public can view qualification objects" ON storage.objects
FOR SELECT USING (bucket_id = 'qualification-objects');

CREATE POLICY "Public can upload qualification objects" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'qualification-objects');

CREATE POLICY "Public can update qualification objects" ON storage.objects
FOR UPDATE USING (bucket_id = 'qualification-objects');

CREATE POLICY "Public can delete qualification objects" ON storage.objects
FOR DELETE USING (bucket_id = 'qualification-objects');
```

### Вариант 2: Аутентифицированные политики (для продакшена)

Выполните SQL команды из файла `fix_qualification_objects_rls.sql`:

```sql
-- Создание политик для аутентифицированных пользователей
CREATE POLICY "Allow authenticated users to view qualification objects" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'qualification-objects'
);

CREATE POLICY "Allow authenticated users to upload qualification objects" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'qualification-objects'
  AND auth.uid() IS NOT NULL
);
```

## Инструкции по применению

### Быстрое решение:
1. Запустите `disable_rls_qualification_objects.bat`
2. Следуйте инструкциям в окне
3. Выполните SQL команды в Supabase Dashboard

### Ручное выполнение:
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте и выполните содержимое файла `disable_rls_qualification_objects.sql`
5. Нажмите **Run**

## Проверка результата

После выполнения SQL команд:
1. Попробуйте снова загрузить файл плана объекта квалификации
2. Ошибка "new row violates row-level security policy" должна исчезнуть
3. Файлы должны успешно загружаться в bucket `qualification-objects`

## Файлы решения

- `disable_rls_qualification_objects.sql` - SQL скрипт с публичными политиками
- `disable_rls_qualification_objects.bat` - Batch файл с инструкциями
- `fix_qualification_objects_rls.sql` - SQL скрипт с аутентифицированными политиками
- `fix_qualification_objects_rls.bat` - Batch файл с инструкциями

## Безопасность

⚠️ **ВНИМАНИЕ**: Публичные политики подходят только для разработки. В продакшене следует:
1. Использовать Supabase Auth для аутентификации
2. Настроить правильные RLS политики
3. Ограничить доступ к файлам по ролям пользователей

## Статус
✅ **РЕШЕНИЕ ГОТОВО** - Созданы SQL скрипты и инструкции для исправления ошибки RLS политики























