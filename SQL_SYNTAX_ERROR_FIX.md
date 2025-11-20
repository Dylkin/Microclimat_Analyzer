# Исправление синтаксической ошибки в SQL скрипте

## Проблема
При выполнении SQL команды создания таблицы `qualification_work_schedule` возникает ошибка:
```
ERROR: 42601: syntax error at end of input
LINE 0:
```

## Причина
В оригинальном SQL скрипте была синтаксическая ошибка - лишняя запятая после последнего поля таблицы.

## Решение

### Вариант 1: Использовать исправленный простой скрипт (Рекомендуется)

Выполните SQL команды из файла `create_qualification_work_schedule_simple.sql`:

```sql
-- Простое создание таблицы для хранения расписания квалификационных работ
CREATE TABLE IF NOT EXISTS qualification_work_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_object_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  stage_description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_object_id 
  ON qualification_work_schedule(qualification_object_id);

-- Включение RLS
ALTER TABLE qualification_work_schedule ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can view all work schedules" ON qualification_work_schedule 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert work schedules" ON qualification_work_schedule 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update work schedules" ON qualification_work_schedule 
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete work schedules" ON qualification_work_schedule 
FOR DELETE USING (auth.role() = 'authenticated');
```

### Вариант 2: Использовать полный исправленный скрипт

Выполните SQL команды из файла `create_qualification_work_schedule_table_fixed.sql`.

## Пошаговая инструкция

### 1. Откройте Supabase Dashboard
- Войдите в свой аккаунт Supabase
- Выберите нужный проект

### 2. Перейдите в SQL Editor
- В левом меню нажмите "SQL Editor"
- Нажмите "New query"

### 3. Выполните SQL команды
- Скопируйте содержимое файла `create_qualification_work_schedule_simple.sql`
- Вставьте в SQL Editor
- Нажмите "Run" или Ctrl+Enter

### 4. Проверьте результат
- Должно появиться сообщение об успешном выполнении
- В левом меню в разделе "Table Editor" должна появиться таблица `qualification_work_schedule`

### 5. Проверьте работу приложения
- Запустите приложение: `npm run dev`
- Перейдите в "Справочник контрагентов"
- Создайте объект квалификации
- Установите даты в блоке "План график проведения квалификационных работ"
- Нажмите "Сохранить"

## Проверка создания таблицы

Выполните следующий SQL запрос для проверки:

```sql
-- Проверка существования таблицы
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'qualification_work_schedule'
ORDER BY ordinal_position;
```

## Возможные проблемы и решения

### Проблема: "relation qualification_objects does not exist"
**Решение:** Сначала создайте таблицу `qualification_objects` или используйте простую версию скрипта без внешнего ключа.

### Проблема: "permission denied"
**Решение:** Убедитесь, что у вас есть права администратора в Supabase проекте.

### Проблема: "duplicate key value violates unique constraint"
**Решение:** Таблица уже существует. Используйте `DROP TABLE IF EXISTS qualification_work_schedule;` перед созданием.

## Файлы для исправления:
- `create_qualification_work_schedule_simple.sql` - простая версия (рекомендуется)
- `create_qualification_work_schedule_table_fixed.sql` - полная версия
- `setup_qualification_work_schedule_database_fixed.bat` - обновленный bat файл
- `SQL_SYNTAX_ERROR_FIX.md` - данная инструкция























