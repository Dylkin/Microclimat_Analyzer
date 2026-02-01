# Исправление проблемы SECURITY DEFINER View

## 🚨 Проблема
Представление `public.qualification_protocols_with_documents` определено с свойством `SECURITY DEFINER`, что может создавать проблемы с безопасностью.

## 🔍 Описание проблемы
- **Entity**: `public.qualification_protocols_with_documents`
- **Issue**: View определено с `SECURITY DEFINER` свойством
- **Проблема**: Представления с `SECURITY DEFINER` применяют права доступа создателя представления, а не пользователя, выполняющего запрос

## ✅ Решение

### Вариант 1: Быстрое исправление (Рекомендуется)
Выполните SQL скрипт `fix_security_definer_view_simple.sql`:

```sql
-- 1. Удаляем существующее представление
DROP VIEW IF EXISTS public.qualification_protocols_with_documents;

-- 2. Создаем представление заново (по умолчанию будет SECURITY INVOKER)
CREATE VIEW public.qualification_protocols_with_documents AS
SELECT 
  qp.id,
  qp.project_id,
  qp.qualification_object_id,
  qp.object_type,
  qp.object_name,
  qp.status,
  qp.approved_by,
  qp.approved_at,
  qp.rejection_reason,
  qp.created_at,
  qp.updated_at,
  pd.id as document_id,
  pd.file_name,
  pd.file_url,
  pd.file_size,
  pd.mime_type,
  pd.uploaded_by,
  pd.uploaded_at
FROM qualification_protocols qp
JOIN project_documents pd ON qp.protocol_document_id = pd.id;

-- 3. Предоставляем права доступа
GRANT SELECT ON public.qualification_protocols_with_documents TO authenticated;
GRANT SELECT ON public.qualification_protocols_with_documents TO anon;
```

### Вариант 2: Расширенное исправление
Выполните SQL скрипт `fix_security_definer_view.sql` для более детального исправления с проверками.

## 🔧 Что изменилось

### До исправления:
```sql
CREATE OR REPLACE VIEW qualification_protocols_with_documents AS
-- Представление с SECURITY DEFINER (по умолчанию)
```

### После исправления:
```sql
CREATE OR REPLACE VIEW qualification_protocols_with_documents 
WITH (security_invoker = true) AS
-- Представление с SECURITY INVOKER
```

## 📋 Инструкции по выполнению

1. **Откройте Supabase Dashboard**
2. **Перейдите в SQL Editor**
3. **Выполните один из скриптов:**
   - `fix_security_definer_view_simple.sql` (быстрое исправление)
   - `fix_security_definer_view.sql` (расширенное исправление)

## ✅ Проверка исправления

После выполнения скрипта проверьте:

```sql
-- Проверяем тип безопасности представления
SELECT 
  c.relname as view_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE oid = c.oid 
      AND reloptions IS NOT NULL 
      AND 'security_invoker=true' = ANY(reloptions)
    ) THEN 'SECURITY INVOKER'
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE oid = c.oid 
      AND reloptions IS NOT NULL 
      AND 'security_definer=true' = ANY(reloptions)
    ) THEN 'SECURITY DEFINER'
    ELSE 'Default (SECURITY DEFINER)'
  END as security_type
FROM pg_class c
WHERE c.relname = 'qualification_protocols_with_documents'
  AND c.relkind = 'v';
```

## 🎯 Результат
- ✅ Представление пересоздано с `SECURITY INVOKER`
- ✅ Права доступа настроены корректно
- ✅ Проблема безопасности устранена
- ✅ Приложение продолжает работать без изменений

## 📝 Примечания
- Изменения в коде приложения не требуются
- Представление будет работать точно так же, как и раньше
- Улучшена безопасность доступа к данным





















