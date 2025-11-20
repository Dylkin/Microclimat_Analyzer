# Решение проблемы с отображением ФИО пользователей

## Проблема
В истории согласований документов отображается email пользователя вместо ФИО (полного имени).

## Диагностика
Логи показывают:
```
Загружены ФИО пользователей из public.users: []
GET https://rcplxggzlkqsypffugno.supabase.co/rest/v1/users?select=full_name&id=eq.60d1399a-56be-4d32-a745-b95aab825ec3 406 (Not Acceptable)
```

Это означает, что:
1. Таблица `public.users` существует и доступна
2. Но в ней нет пользователя с ID `60d1399a-56be-4d32-a745-b95aab825ec3`

## Решение

### Шаг 1: Проверка таблицы users
Выполните SQL скрипт `check_users_table.sql` в Supabase SQL Editor:

```sql
-- Проверяем, есть ли пользователь с нужным ID
SELECT id, email, full_name, role 
FROM public.users 
WHERE id = '60d1399a-56be-4d32-a745-b95aab825ec3';

-- Проверяем все пользователей в таблице
SELECT id, email, full_name, role, created_at
FROM public.users
ORDER BY created_at DESC;
```

### Шаг 2: Добавление пользователя
Если пользователя нет в таблице, выполните SQL скрипт `add_user_to_users_table.sql`:

```sql
-- Добавляем пользователя
INSERT INTO public.users (id, email, full_name, role)
VALUES ('60d1399a-56be-4d32-a745-b95aab825ec3', 'pavel.dylkin@gmail.com', 'Павел Дылкин', 'specialist')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
```

### Шаг 3: Создание RPC функции (опционально)
Для более надежной работы создайте RPC функцию `create_get_user_info_rpc.sql`:

```sql
-- Создаем функцию для получения информации о пользователе
CREATE OR REPLACE FUNCTION get_user_info(user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Сначала пробуем получить из public.users
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role::text
  FROM public.users u
  WHERE u.id = user_id;
  
  -- Если не найдено в public.users, пробуем получить из auth.users
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
      'specialist'::text as role
    FROM auth.users au
    WHERE au.id = user_id;
  END IF;
END;
$$;

-- Даем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_user_info(uuid) TO authenticated;
```

## Логика работы приложения

Приложение теперь работает по следующей схеме:

1. **Первый приоритет**: Загрузка ФИО из таблицы `public.users`
2. **Второй приоритет**: Если данные пустые, попытка загрузки через RPC функцию `get_user_info`
3. **Fallback**: Если ничего не работает, отображение email из истории согласований

## Проверка результата

После выполнения SQL скриптов:

1. Обновите страницу "Согласование документов"
2. Проверьте консоль браузера на наличие сообщений:
   - `Загружены ФИО пользователей из public.users: [массив с данными]`
   - Или `Загружены данные через RPC: [массив с данными]`
3. В истории согласований должно отображаться ФИО вместо email

## Файлы для выполнения

1. `check_users_table.sql` - диагностика таблицы users
2. `add_user_to_users_table.sql` - добавление пользователя
3. `create_get_user_info_rpc.sql` - создание RPC функции

Выполняйте скрипты в указанном порядке в Supabase SQL Editor.



















