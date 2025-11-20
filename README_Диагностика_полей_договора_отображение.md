# Диагностика проблемы с отображением полей договора

## Проблема
В интерфейсе отображается блок "Поля договора" с кнопкой "Редактировать", но поля показывают "Не указан" и "Не указана" вместо реальных данных.

## Возможные причины

### 1. Отсутствует поле `contract_date` в таблице `projects`
**Проверка**: Выполните SQL скрипт `check_contract_date_quick.sql` в Supabase SQL Editor.

### 2. Данные проекта не загружаются правильно
**Проверка**: Откройте консоль браузера и проверьте логи `ContractFields`.

### 3. Проблемы с RLS (Row Level Security)
**Проверка**: Убедитесь, что у пользователя есть права на чтение таблицы `projects`.

## Диагностические шаги

### Шаг 1: Проверьте структуру таблицы projects
Выполните `check_contract_date_quick.sql` в Supabase SQL Editor:

```sql
-- Проверяем структуру таблицы projects
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
  AND column_name IN ('contract_number', 'contract_date')
ORDER BY column_name;
```

### Шаг 2: Проверьте данные в таблице projects
```sql
-- Проверяем данные в таблице projects
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  created_at,
  updated_at
FROM public.projects
LIMIT 5;
```

### Шаг 3: Проверьте логи в консоли браузера
1. Откройте страницу с полями договора
2. Откройте консоль браузера (F12)
3. Найдите логи `ContractFields: Обновление данных проекта`
4. Проверьте, какие данные передаются в компонент

### Шаг 4: Проверьте загрузку проекта
1. Перейдите на страницу "Проекты квалификации"
2. Выберите проект
3. Перейдите на страницу "Согласование договора"
4. Проверьте логи в консоли

## Возможные решения

### Решение 1: Добавить поле contract_date
Если поле отсутствует, выполните:
```sql
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';
```

### Решение 2: Проверить RLS политики
```sql
-- Проверяем политики для таблицы projects
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'projects';
```

### Решение 3: Обновить данные проекта
Если данные есть в базе, но не отображаются:
1. Выйдите из системы
2. Войдите заново
3. Проверьте логи загрузки проекта

## Отладочная информация

В код добавлены логи для диагностики:

### В ContractFields.tsx:
- Логирование данных проекта при обновлении
- Логирование процесса сохранения
- Детальная информация о передаваемых данных

### В projectService.ts:
- Логирование данных обновления
- Логирование результата запроса к Supabase

## Файлы для диагностики

- `check_contract_date_quick.sql` - быстрая проверка структуры таблицы
- `src/components/contract/ContractFields.tsx` - компонент с отладочными логами
- `src/utils/projectService.ts` - сервис с отладочными логами

## Следующие шаги

1. **Выполните диагностику** используя указанные шаги
2. **Проверьте логи** в консоли браузера
3. **Выполните SQL скрипт** для проверки структуры таблицы
4. **При необходимости** добавьте поле `contract_date` в базу данных
5. **Проверьте RLS политики** для таблицы `projects`

## Ожидаемые логи в консоли

После исправления в консоли должны появиться логи:
```
ContractFields: Обновление данных проекта {
  projectId: "project-id",
  contractNumber: "12345",
  contractDate: "2024-01-01",
  project: { ... }
}
```

Если логи показывают `null` или `undefined` для полей договора, проблема в загрузке данных из базы.



















