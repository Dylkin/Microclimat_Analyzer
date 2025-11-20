# Создание таблицы audit_logs

## 🎯 Проблема решена!

**Ошибка:** `ERROR: 42P01: relation "public.audit_logs" does not exist`

**Причина:** Таблица `audit_logs` не была создана в базе данных Supabase.

## 🚀 Решение

### Шаг 1: Создание таблицы

Выполните в **Supabase SQL Editor** скрипт `create_audit_logs_simple.sql`:

```sql
-- Создание таблицы для аудита действий пользователей
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создание индексов
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- Включение RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'administrator')
        )
    );

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_update_policy" ON public.audit_logs
    FOR UPDATE
    USING (false);

CREATE POLICY "audit_logs_delete_policy" ON public.audit_logs
    FOR DELETE
    USING (false);
```

### Шаг 2: Проверка создания

После выполнения скрипта проверьте:

```sql
-- Проверка структуры таблицы
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Проверка количества записей (должно быть 0)
SELECT COUNT(*) as total_records FROM public.audit_logs;
```

### Шаг 3: Создание тестовой записи (опционально)

Для проверки работы создайте тестовую запись:

```sql
-- Вставляем тестовую запись
INSERT INTO public.audit_logs (
    user_id,
    user_name,
    user_role,
    action,
    entity_type,
    entity_id,
    entity_name,
    details
) VALUES (
    auth.uid(),
    'Тестовый пользователь',
    'admin',
    'document_approved',
    'document',
    'test-doc-123',
    'Тестовый документ',
    '{"test": true}'::jsonb
);
```

## ✅ Проверка работоспособности

### 1. Перезагрузите страницу аудита
- Откройте "Аудит действий пользователей"
- Страница должна загрузиться без ошибок

### 2. Проверьте консоль браузера
- Нажмите F12
- Убедитесь, что нет ошибок с префиксом `AuditService:`

### 3. Протестируйте функциональность
- Если есть тестовые данные, они должны отображаться
- Фильтры должны работать
- Экспорт в CSV должен функционировать

## 📊 Структура таблицы

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор записи |
| `user_id` | UUID | ID пользователя, выполнившего действие |
| `user_name` | TEXT | Имя пользователя |
| `user_role` | TEXT | Роль пользователя |
| `action` | TEXT | Тип действия (document_approved, etc.) |
| `entity_type` | TEXT | Тип сущности (document, project, etc.) |
| `entity_id` | TEXT | ID сущности |
| `entity_name` | TEXT | Название сущности |
| `details` | JSONB | Дополнительные детали |
| `timestamp` | TIMESTAMPTZ | Время выполнения действия |
| `ip_address` | INET | IP адрес пользователя |
| `user_agent` | TEXT | User Agent браузера |
| `created_at` | TIMESTAMPTZ | Время создания записи |

## 🔒 Безопасность

### RLS политики:
- **Чтение:** Только администраторы (`admin`, `administrator`)
- **Запись:** Все аутентифицированные пользователи
- **Изменение/Удаление:** Запрещено (логи неизменяемы)

### Индексы:
- Оптимизированы для быстрого поиска по пользователю, действию, типу сущности и времени

## 🎯 Результат

После выполнения всех шагов:

- ✅ Таблица `audit_logs` создана
- ✅ RLS политики настроены
- ✅ Индексы созданы
- ✅ Страница аудита работает без ошибок
- ✅ Система готова к записи событий

**Проблема полностью решена!** 🎉



















