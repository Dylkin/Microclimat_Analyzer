# Исправление ошибки "Bucket not found"

## Проблема
Загруженные пользователем документы не открываются с ошибкой:
```json
{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}
```

## Причина
В Supabase Storage отсутствуют необходимые buckets для хранения файлов приложения.

## Решение

### Вариант 1: Автоматическое исправление (рекомендуется)

1. **Запустите диагностику:**
   ```bash
   start_with_bucket_diagnostic.bat
   ```

2. **Или выполните SQL команды вручную:**
   - Откройте Supabase Dashboard: https://supabase.com/dashboard
   - Перейдите в SQL Editor
   - Выполните содержимое файла `complete_bucket_fix.sql`

### Вариант 2: Ручное исправление

1. **Откройте Supabase Dashboard:**
   - Перейдите на https://supabase.com/dashboard
   - Войдите в свой аккаунт
   - Выберите ваш проект

2. **Перейдите в SQL Editor:**
   - В левом меню нажмите "SQL Editor"
   - Нажмите "New query"

3. **Выполните SQL команды:**
   ```sql
   -- Создание bucket для документов проектов
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'documents',
     'documents',
     true,
     52428800,
     ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
   )
   ON CONFLICT (id) DO UPDATE SET
     public = true,
     file_size_limit = 52428800,
     allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

   -- Создание bucket для файлов объектов квалификации
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'qualification-objects',
     'qualification-objects',
     true,
     52428800,
     ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
   )
   ON CONFLICT (id) DO UPDATE SET
     public = true,
     file_size_limit = 52428800,
     allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

   -- Создание bucket для файлов оборудования
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'equipment-files',
     'equipment-files',
     true,
     52428800,
     ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
   )
   ON CONFLICT (id) DO UPDATE SET
     public = true,
     file_size_limit = 52428800,
     allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
   ```

### Вариант 3: Быстрое исправление

Запустите bat-файл:
```bash
fix_all_buckets.bat
```

## Проверка исправления

После выполнения SQL команд:

1. **Вернитесь в приложение**
2. **Попробуйте загрузить документ:**
   - Перейдите на страницу "Согласование договора"
   - Загрузите любой документ (PDF, DOC, DOCX)
3. **Попробуйте открыть существующий документ:**
   - Нажмите на кнопку "Просмотреть" рядом с документом
   - Документ должен открыться в новой вкладке
4. **Попробуйте скачать документ:**
   - Нажмите на кнопку "Скачать" рядом с документом
   - Файл должен скачаться

## Созданные Buckets

| Bucket ID | Назначение | Типы файлов | Размер |
|-----------|------------|-------------|---------|
| `documents` | Документы проектов (договоры, коммерческие предложения, протоколы) | PDF, DOC, DOCX | 50MB |
| `qualification-objects` | Файлы объектов квалификации (планы, тестовые данные) | PDF, DOC, DOCX, JPEG, PNG | 50MB |
| `equipment-files` | Файлы оборудования (аттестации, сертификаты) | PDF, DOC, DOCX, JPEG, PNG | 50MB |

## Дополнительные файлы

- `complete_bucket_fix.sql` - Полный SQL скрипт для создания всех buckets
- `fix_bucket_not_found.sql` - Простой SQL скрипт для создания только основного bucket
- `fix_all_buckets.bat` - Bat-файл с инструкциями
- `src/components/BucketDiagnostic.tsx` - React компонент для диагностики
- `start_with_bucket_diagnostic.bat` - Запуск приложения с диагностикой

## Если проблемы остаются

1. **Проверьте переменные окружения:**
   - `VITE_SUPABASE_URL` должен быть настроен
   - `VITE_SUPABASE_ANON_KEY` должен быть настроен

2. **Проверьте права доступа:**
   - Убедитесь, что вы авторизованы в приложении
   - Проверьте, что RLS политики настроены правильно

3. **Проверьте логи браузера:**
   - Откройте Developer Tools (F12)
   - Перейдите на вкладку Console
   - Ищите ошибки связанные с Storage

4. **Обратитесь к документации Supabase:**
   - https://supabase.com/docs/guides/storage
   - https://supabase.com/docs/guides/storage/security/access-control























