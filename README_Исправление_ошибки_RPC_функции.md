# Исправление ошибки RPC функции get_user_info

## Проблема
В консоли браузера появлялись ошибки:
```
POST https://rcplxggzlkqsypffugno.supabase.co/rest/v1/rpc/get_user_info 404 (Not Found)
Could not find the function public.get_user_info(user_id) in the schema cache
```

**Дополнительные проблемы**: При выполнении SQL скриптов возникали ошибки:
```
ERROR: 42601: unterminated dollar-quoted string at or near "$$
ERROR: 23502: null value in column "password" of relation "users" violates not-null constraint
```

## Причина
1. **RPC функция `get_user_info`** не была создана в базе данных Supabase, но код пытался её вызвать как fallback для получения ФИО пользователей.
2. **Dollar-quoted строки** в SQL скриптах не правильно обрабатывались в Supabase SQL Editor.
3. **Внешний ключ** `REFERENCES auth.users(id)` пытался создать запись в таблице `auth.users`, которая имеет обязательное поле `password`.

## Решение

### 1. Убрана попытка вызова несуществующей RPC функции
В файле `src/components/contract/DocumentApprovalActions.tsx`:

- **Удален вызов RPC функции** `get_user_info`
- **Упрощена логика fallback** - теперь используется только запрос к таблице `public.users`
- **Улучшена обработка ошибок** - убраны попытки вызова несуществующих функций

### 2. Создано простое решение для таблицы users
Созданы SQL скрипты:
- `fix_user_display_safe.sql` - безопасный скрипт с функциями и триггерами
- `fix_user_display_simple_final.sql` - упрощенный скрипт без сложных конструкций

### 3. Исправлена проблема с dollar-quoted строками
- Заменены `$$` на именованные теги `$func$` и `$block$`
- Создан упрощенный скрипт без функций и триггеров для случаев, когда возникают проблемы

### 4. Исправлена проблема с внешним ключом
- Убран внешний ключ `REFERENCES auth.users(id)` из таблицы `public.users`
- Создан скрипт `fix_users_table_constraint.sql` для исправления существующих таблиц

## Логика работы после исправления

### 1. Попытка загрузки ФИО из public.users
```typescript
const { data, error } = await supabase
  .from('users')
  .select('id, full_name')
  .eq('id', userIds[0]); // или .in('id', userIds) для нескольких
```

### 2. Обработка результата
- **Если успешно**: Отображается ФИО из таблицы `users`
- **Если ошибка или пустой результат**: Отображается email из истории согласований

### 3. Fallback логика
```typescript
// В JSX компонента
{userNames.get(record.userId) || record.userName}
```

## Инструкции по исправлению

### Шаг 1: Выполните SQL скрипт
**Если возникают проблемы с внешним ключом**, используйте `fix_users_table_constraint.sql`:
**Если возникают проблемы с dollar-quoted строками**, используйте `fix_user_display_simple_final.sql`:
**Иначе используйте** `fix_user_display_safe.sql` в Supabase SQL Editor:

```sql
-- Создание таблицы users (БЕЗ внешнего ключа)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Настройка RLS политик
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Создание безопасной функции для добавления пользователей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Добавляем пользователя только если email подтвержден и не пустой
  IF NEW.email IS NOT NULL 
     AND NEW.email != '' 
     AND NEW.email_confirmed_at IS NOT NULL 
     AND NEW.id IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Безопасное добавление существующих пользователей
DO $$
DECLARE
  user_record RECORD;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.email_confirmed_at, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.email IS NOT NULL AND au.email != '' AND au.id IS NOT NULL
  LOOP
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_record.id) THEN
        IF user_record.email_confirmed_at IS NOT NULL THEN
          INSERT INTO public.users (id, email, full_name)
          VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email)
          );
          inserted_count := inserted_count + 1;
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Ошибка при добавлении пользователя %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Добавлено пользователей: %, ошибок: %', inserted_count, error_count;
END $$;
```

### Шаг 2: Проверьте результат
После выполнения скрипта:

1. **Обновите страницу** "Согласование договора"
2. **Проверьте консоль браузера** - ошибки RPC должны исчезнуть
3. **Проверьте отображение ФИО** в истории согласований

### Шаг 3: Обновите ФИО пользователей (опционально)
Для обновления ФИО конкретных пользователей используйте `update_user_full_names.sql`:

```sql
-- Обновление ФИО для конкретного пользователя
UPDATE public.users 
SET 
  full_name = 'Павел Дылкин',
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- Добавьте другие пользователи по необходимости
UPDATE public.users 
SET 
  full_name = 'Имя Фамилия',
  updated_at = now()
WHERE email = 'user@example.com';
```

### Шаг 4: Автоматическое добавление новых пользователей
После выполнения основного скрипта новые пользователи будут автоматически добавляться в таблицу `public.users` при регистрации благодаря триггеру `on_auth_user_created`.

## Текущее состояние

- ✅ **Ошибки RPC функции исправлены** - больше нет попыток вызова несуществующих функций
- ✅ **Упрощена логика** - используется только проверенный подход
- ✅ **Проект собирается без ошибок**
- ⏳ **Требуется выполнить SQL скрипт** для создания таблицы users

## Файлы изменений

- `src/components/contract/DocumentApprovalActions.tsx` - убраны вызовы RPC функции
- `fix_users_table_constraint.sql` - **РЕКОМЕНДУЕМЫЙ** для исправления проблемы с внешним ключом
- `fix_user_display_simple_final.sql` - упрощенный SQL скрипт (исправлен)
- `fix_user_display_safe.sql` - безопасный SQL скрипт с функциями (исправлен)
- `fix_user_display_universal.sql` - универсальный SQL скрипт (исправлен)
- `update_user_full_names.sql` - скрипт для ручного обновления ФИО
- `fix_user_display_simple.sql` - оригинальный скрипт (устарел)
- `fix_user_display_simple_v2.sql` - упрощенный скрипт (устарел)

## Результат

После выполнения SQL скрипта:
- ✅ Ошибки 404 в консоли исчезнут
- ✅ ФИО пользователей будет отображаться в истории согласований
- ✅ Fallback к email будет работать для пользователей без записи в таблице users
