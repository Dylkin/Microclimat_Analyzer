# Исправление типа поля measurement_level

## Проблема
При загрузке файлов XLS с дробными значениями уровня измерения (например, 0.2) возникает ошибка:
```
invalid input syntax for type integer: "0.2"
```

Это происходит потому, что поле `measurement_level` в базе данных имеет тип `integer`, который не поддерживает дробные значения.

## Решение

### 1. Выполните SQL скрипт

Запустите файл `fix_measurement_level_type.sql` в вашей базе данных Supabase:

```sql
-- Изменяем тип поля measurement_level на numeric во всех таблицах
-- 1. logger_data_summary (integer -> numeric)
ALTER TABLE logger_data_summary 
ALTER COLUMN measurement_level TYPE numeric(10,2);

-- 2. logger_data_records (integer -> numeric)
ALTER TABLE logger_data_records
ALTER COLUMN measurement_level TYPE numeric(10,2);

-- 3. logger_data_analysis (integer -> numeric)
ALTER TABLE logger_data_analysis
ALTER COLUMN measurement_level TYPE numeric(10,2);

-- 4. uploaded_files (text -> numeric) - конвертируем текстовые значения в числа
-- Сначала конвертируем в text для работы с регулярными выражениями
ALTER TABLE uploaded_files 
ALTER COLUMN measurement_level TYPE text;

-- Затем обновляем данные
UPDATE uploaded_files
SET measurement_level = CASE
    WHEN measurement_level ~ '^[0-9]+\.?[0-9]*$' THEN measurement_level
    WHEN measurement_level = '' THEN NULL
    ELSE '0'
END;

-- И наконец конвертируем в numeric
ALTER TABLE uploaded_files
ALTER COLUMN measurement_level TYPE numeric(10,2)
USING measurement_level::numeric(10,2);
```

### 2. Альтернативный способ через Supabase Dashboard

1. Откройте Supabase Dashboard
2. Перейдите в раздел "Table Editor"
3. Найдите таблицу `logger_data_summary`
4. Нажмите на колонку `measurement_level`
5. Измените тип с `int4` на `numeric(10,2)`
6. Сохраните изменения

### 3. Проверка результата

После выполнения исправления проверьте, что:
- Поле `measurement_level` теперь имеет тип `numeric(10,2)`
- Можно сохранять дробные значения (0.2, 1.5, 2.0 и т.д.)

### 4. Тестирование

Попробуйте загрузить файл XLS с дробным значением уровня измерения. Ошибка должна исчезнуть.

## Затронутые таблицы

Найдены следующие таблицы с полем `measurement_level`:

### Требуют исправления (integer → numeric):
- `logger_data_summary` - основная таблица со сводной информацией
- `logger_data_records` - таблица с детальными записями данных
- `logger_data_analysis` - таблица с результатами анализа

### Требует исправления (text → numeric):
- `uploaded_files` - таблица с информацией о загруженных файлах

### Уже правильный тип:
- `project_equipment_assignments` - уже имеет тип `numeric`

## Примечания

- `numeric(10,2)` означает: до 10 цифр всего, из них 2 после запятой
- Это позволяет хранить значения от -99999999.99 до 99999999.99
- Для уровней измерения этого диапазона более чем достаточно
