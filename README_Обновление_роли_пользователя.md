# Обновление роли пользователя на администратора

## Проблема
Пользователь успешно авторизовался, но у него отсутствуют права администратора. В интерфейсе отображается "Доступ запрещен".

## Решение

### 1. Выполните SQL скрипт для обновления роли

Выполните скрипт `update_user_role.sql` в Supabase SQL Editor. Скрипт автоматически:
- Проверит структуру таблицы `users`
- Добавит столбец `role` если он отсутствует
- Обновит роль пользователя на `'admin'`
- Обновит роль в `auth.users`

```sql
-- 1. Проверяем структуру таблицы users
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Если столбец role отсутствует, добавляем его
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 3. Добавляем комментарий к столбцу
COMMENT ON COLUMN public.users.role IS 'Роль пользователя: admin, specialist, user';

-- 4. Проверяем текущую роль пользователя
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';

-- 5. Обновляем роль пользователя на 'admin'
UPDATE public.users 
SET 
  role = 'admin',
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 6. Проверяем результат обновления
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';

-- 7. Также обновляем роль в auth.users (user_metadata)
UPDATE auth.users 
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 8. Проверяем обновление в auth.users
SELECT 
  id,
  email,
  raw_user_meta_data,
  updated_at
FROM auth.users 
WHERE email = 'pavel.dylkin@gmail.com';
```

### 2. Обновите код для правильного получения роли

В файле `src/utils/userService.ts` обновлена логика получения роли:
- Приоритизируется роль из `public.users`
- Используется роль из `auth.users` как fallback
- По умолчанию устанавливается роль `'user'`

### 3. Перезайдите в систему

После обновления роли в базе данных:
1. **Выйдите из системы** (нажмите "Выйти")
2. **Войдите заново** с теми же учетными данными
3. **Проверьте доступ** - теперь должны быть доступны все функции администратора

## Доступные роли в системе

- `'admin'` - Полный доступ ко всем функциям
- `'specialist'` - Доступ к специализированным функциям
- `'user'` - Базовый доступ (по умолчанию)

## Проверка роли пользователя

### Через SQL запрос:
```sql
SELECT 
  u.email,
  u.full_name,
  u.role,
  au.raw_user_meta_data->>'role' as auth_role
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'pavel.dylkin@gmail.com';
```

### Через консоль браузера:
```javascript
// Проверка текущего пользователя
console.log('Текущий пользователь:', JSON.parse(localStorage.getItem('currentUser')));
```

## Возможные проблемы

### Проблема: Роль не обновилась после перезахода
**Решение**: 
1. Очистите localStorage: `localStorage.clear()`
2. Перезагрузите страницу
3. Войдите заново

### Проблема: Доступ все еще запрещен
**Решение**:
1. Проверьте, что роль обновилась в базе данных
2. Убедитесь, что выполнили обновление в обеих таблицах (`public.users` и `auth.users`)
3. Проверьте логи в консоли браузера

### Проблема: Ошибка при обновлении auth.users
**Решение**: 
- Убедитесь, что у вас есть права администратора в Supabase
- Попробуйте обновить только `public.users` (это должно быть достаточно)

## Файлы изменений

- `update_user_role.sql` - SQL скрипт для обновления роли
- `src/utils/userService.ts` - обновлена логика получения роли
- `README_Обновление_роли_пользователя.md` - инструкции

## Следующие шаги

1. **Выполните SQL скрипт** `update_user_role.sql`
2. **Выйдите и войдите заново** в систему
3. **Проверьте доступ** - теперь должны быть доступны все функции
4. **Проверьте поля договора** - теперь можно тестировать сохранение

После выполнения этих шагов пользователь должен получить полные права администратора!
