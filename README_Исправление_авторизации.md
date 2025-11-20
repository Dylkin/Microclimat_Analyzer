# Исправление проблемы с авторизацией

## Проблема
Ошибка `column users.password does not exist` при попытке входа в систему. Система пытается авторизоваться через таблицу `public.users`, но эта таблица не предназначена для авторизации.

## Причина
В Supabase авторизация должна происходить через `auth.users`, а не через `public.users`. Таблица `public.users` предназначена только для хранения дополнительной информации о пользователях (ФИО, роли и т.д.).

## Решение

### 1. Исправлен userService.ts
- Заменена авторизация через `public.users` на `supabase.auth.signInWithPassword()`
- Добавлено получение дополнительной информации из `public.users` после успешной авторизации
- Убран возврат пароля из соображений безопасности

### 2. Обновлен AuthContext.tsx
- Обновлены комментарии для ясности
- Сохранен fallback на локальные данные

### 3. Создан скрипт для создания пользователя
Файл `create_auth_user.sql` с инструкциями по созданию пользователя в Supabase Auth.

## Инструкции по созданию пользователя

### Способ 1: Через Supabase Dashboard (РЕКОМЕНДУЕМЫЙ)
1. Перейдите в **Authentication > Users** в Supabase Dashboard
2. Нажмите **"Add user"**
3. Заполните поля:
   - **Email**: `pavel.dylkin@gmail.com`
   - **Password**: `00016346`
   - **Email Confirm**: `true`
   - **User Metadata**: 
     ```json
     {
       "full_name": "Павел Дылкин",
       "role": "specialist"
     }
     ```
4. Нажмите **"Create user"**

### Способ 2: Через API (в приложении)
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'pavel.dylkin@gmail.com',
  password: '00016346',
  options: {
    data: {
      full_name: 'Павел Дылкин',
      role: 'specialist'
    }
  }
});
```

### Способ 3: Через SQL (только для администраторов)
```sql
-- Создание пользователя в auth.users (только для администраторов)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'pavel.dylkin@gmail.com',
  crypt('00016346', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name": "Павел Дылкин", "role": "specialist"}'
);
```

## После создания пользователя

### 1. Добавьте пользователя в public.users
Выполните SQL скрипт `create_auth_user.sql` в Supabase SQL Editor:

```sql
INSERT INTO public.users (id, email, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'pavel.dylkin@gmail.com' LIMIT 1),
  'pavel.dylkin@gmail.com',
  'Павел Дылкин'
)
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();
```

### 2. Проверьте результат
```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.created_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';
```

## Логика работы после исправления

1. **Авторизация**: Происходит через `supabase.auth.signInWithPassword()`
2. **Получение данных**: После успешной авторизации получаем дополнительную информацию из `public.users`
3. **Fallback**: Если Supabase Auth недоступен, используется локальная авторизация
4. **Безопасность**: Пароли не возвращаются из API

## Файлы изменений

- `src/utils/userService.ts` - исправлена авторизация
- `src/contexts/AuthContext.tsx` - обновлены комментарии
- `create_auth_user.sql` - скрипт для создания пользователя
- `README_Исправление_авторизации.md` - инструкции

## Следующие шаги

1. **Создайте пользователя** в Supabase Auth одним из указанных способов
2. **Добавьте пользователя** в `public.users` используя SQL скрипт
3. **Проверьте авторизацию** - попробуйте войти в систему
4. **Проверьте логи** в консоли браузера на наличие ошибок

## Возможные проблемы

### Проблема: "Invalid login credentials"
**Решение**: Убедитесь, что пользователь создан в `auth.users` и пароль правильный.

### Проблема: "User not found in public.users"
**Решение**: Выполните SQL скрипт для добавления пользователя в `public.users`.

### Проблема: "Email not confirmed"
**Решение**: В Supabase Dashboard установите `email_confirmed_at` в текущее время.



















