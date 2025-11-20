# Диагностика проблемы с сохранением полей договора

## Проблема
Поля договора (№ договора и Дата договора) не сохраняются в базе данных.

## Возможные причины

### 1. Отсутствует поле `contract_date` в таблице `projects`
**Проверка**: Выполните SQL скрипт `check_contract_date_field.sql` в Supabase SQL Editor.

**Решение**: Если поле отсутствует, выполните:
```sql
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';
```

### 2. Проблемы с RLS (Row Level Security)
**Проверка**: Убедитесь, что у пользователя есть права на обновление таблицы `projects`.

**Решение**: Проверьте политики RLS:
```sql
-- Проверяем политики для таблицы projects
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'projects';
```

### 3. Ошибки в коде
**Проверка**: Откройте консоль браузера и попробуйте сохранить поля договора. Проверьте логи.

## Диагностические шаги

### Шаг 1: Проверьте структуру таблицы
Выполните `check_contract_date_field.sql` в Supabase SQL Editor.

### Шаг 2: Проверьте логи в консоли браузера
1. Откройте страницу "Согласование договора"
2. Нажмите "Редактировать" в блоке "Поля договора"
3. Введите данные и нажмите "Сохранить"
4. Проверьте консоль браузера на наличие ошибок

### Шаг 3: Проверьте сетевые запросы
1. Откройте DevTools (F12)
2. Перейдите на вкладку "Network"
3. Попробуйте сохранить поля договора
4. Найдите запрос к Supabase и проверьте его статус

### Шаг 4: Проверьте данные в базе
```sql
-- Проверяем текущие данные проекта
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  updated_at
FROM public.projects
WHERE id = 'your-project-id';  -- Замените на реальный ID проекта
```

## Отладочная информация

В код добавлены логи для диагностики:

### В ContractFields.tsx:
- Логирование данных перед сохранением
- Логирование результата обновления

### В projectService.ts:
- Логирование данных обновления
- Логирование результата запроса к Supabase

## Возможные решения

### Решение 1: Добавить поле contract_date
```sql
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;
```

### Решение 2: Проверить RLS политики
```sql
-- Создать политику для обновления проектов
CREATE POLICY "Users can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Решение 3: Проверить права пользователя
Убедитесь, что пользователь имеет права на обновление таблицы `projects`.

## Файлы для диагностики

- `check_contract_date_field.sql` - проверка структуры таблицы
- `src/components/contract/ContractFields.tsx` - компонент с отладочными логами
- `src/utils/projectService.ts` - сервис с отладочными логами

## Следующие шаги

1. **Выполните диагностику** используя указанные шаги
2. **Проверьте логи** в консоли браузера
3. **Выполните SQL скрипт** для проверки структуры таблицы
4. **При необходимости** добавьте поле `contract_date` в базу данных
5. **Проверьте RLS политики** для таблицы `projects`



















