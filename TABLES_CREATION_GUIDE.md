# Руководство по созданию таблиц для комментариев и согласования документов

## 🚨 Проблема
Таблицы `document_comments` и `document_approvals` не созданы в Supabase Dashboard, из-за чего:
- ❌ Комментарии пользователей не сохраняются
- ❌ Статусы согласования документов не сохраняются  
- ❌ Данные теряются при обновлении страницы
- ❌ При повторном открытии проекта данные не отображаются

## ✅ Решение

### Шаг 1: Создание таблиц в Supabase

#### 1.1 Откройте Supabase Dashboard
1. Перейдите по адресу: https://supabase.com/dashboard
2. Войдите в свой аккаунт
3. Выберите ваш проект

#### 1.2 Откройте SQL Editor
1. В левом меню нажмите на **"SQL Editor"**
2. Нажмите **"New query"** для создания нового запроса

#### 1.3 Выполните SQL команды
Скопируйте и выполните содержимое файла `quick_create_document_tables.sql`:

```sql
-- Быстрое создание таблиц для комментариев и согласования документов

-- 1. Создание таблицы для комментариев к документам
CREATE TABLE IF NOT EXISTS document_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создание таблицы для записей согласования документов
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_status ON document_approvals(status);

-- 4. Включение RLS (Row Level Security)
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

-- 5. Создание базовых политик безопасности
CREATE POLICY "Users can view all comments" ON document_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON document_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view all approvals" ON document_approvals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert approvals" ON document_approvals FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Проверка создания таблиц
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_comments', 'document_approvals');
```

### Шаг 2: Проверка создания таблиц

#### 2.1 Проверка в Table Editor
1. В левом меню нажмите на **"Table Editor"**
2. Убедитесь, что в списке таблиц есть:
   - `document_comments`
   - `document_approvals`

#### 2.2 Проверка структуры таблиц

**Таблица `document_comments` должна содержать:**
- `id` (UUID, Primary Key)
- `document_id` (TEXT, NOT NULL)
- `user_id` (TEXT, NOT NULL)
- `user_name` (TEXT, NOT NULL)
- `comment` (TEXT, NOT NULL)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Таблица `document_approvals` должна содержать:**
- `id` (UUID, Primary Key)
- `document_id` (TEXT, NOT NULL)
- `user_id` (TEXT, NOT NULL)
- `user_name` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL, CHECK constraint)
- `comment` (TEXT, nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### Шаг 3: Запуск приложения

#### 3.1 Запуск с созданными таблицами
```bash
start_after_tables_created.bat
```

#### 3.2 Проверка работы
1. Откройте страницу "Согласование договора"
2. Добавьте комментарии к документам
3. Согласуйте или отклоните документы
4. Обновите страницу - данные должны сохраниться
5. Перезапустите приложение - данные должны отображаться

## 📁 Созданные файлы

### SQL скрипты:
- `quick_create_document_tables.sql` - быстрое создание таблиц (рекомендуется)
- `create_document_approval_tables.sql` - полное создание с дополнительными функциями

### Bat-файлы:
- `create_document_tables.bat` - инструкции для создания таблиц
- `check_document_tables.bat` - проверка создания таблиц
- `start_after_tables_created.bat` - запуск приложения после создания таблиц

### Документация:
- `CREATE_TABLES_INSTRUCTIONS.md` - подробная инструкция
- `TABLES_CREATION_GUIDE.md` - данное руководство

## 🔍 Проверка работы

### SQL запросы для проверки:

```sql
-- Проверка существования таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_comments', 'document_approvals');

-- Проверка структуры таблицы document_comments
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'document_comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверка структуры таблицы document_approvals
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'document_approvals' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверка политик RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('document_comments', 'document_approvals');
```

## ✅ Результат

После успешного создания таблиц:

✅ **Комментарии пользователей** будут сохраняться в таблице `document_comments`
✅ **Статусы согласования документов** будут сохраняться в таблице `document_approvals`
✅ **Данные будут сохраняться** между сессиями
✅ **При повторном открытии проекта** все данные будут отображаться
✅ **Приложение будет работать** корректно

## 🚨 Устранение неполадок

### Если таблицы не создаются:
1. Проверьте, что вы находитесь в правильном проекте Supabase
2. Убедитесь, что у вас есть права на создание таблиц
3. Проверьте синтаксис SQL команд
4. Попробуйте выполнить команды по одной

### Если возникают ошибки RLS:
1. Убедитесь, что аутентификация настроена
2. Проверьте, что пользователь авторизован
3. При необходимости временно отключите RLS:
   ```sql
   ALTER TABLE document_comments DISABLE ROW LEVEL SECURITY;
   ALTER TABLE document_approvals DISABLE ROW LEVEL SECURITY;
   ```

### Если данные не сохраняются:
1. Проверьте, что таблицы созданы
2. Убедитесь, что RLS политики настроены правильно
3. Проверьте консоль браузера на наличие ошибок
4. Убедитесь, что переменные окружения Supabase настроены

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что все SQL команды выполнены успешно
3. Проверьте, что таблицы созданы в правильном проекте Supabase
4. Убедитесь, что переменные окружения настроены корректно























