# Исправление ошибки "Ошибка загрузки расписания из базы данных"

## Проблема

При открытии плана-графика проведения квалификационных работ для объекта "ХК-32" возникает ошибка "Ошибка загрузки расписания из базы данных". Эта ошибка возникает потому, что код пытается использовать поле `project_id` в таблице `qualification_work_schedule`, которое может отсутствовать в базе данных.

## Причина

Код был обновлен для поддержки привязки этапов квалификационных работ к конкретным проектам, но SQL скрипт для добавления поля `project_id` в таблицу `qualification_work_schedule` не был применен к базе данных.

## Решение

### 1. Применить SQL скрипт (Рекомендуется)

Выполните SQL скрипт `add_project_id_to_qualification_work_schedule.sql` в Supabase Dashboard:

```sql
-- Добавление поля project_id в таблицу qualification_work_schedule
DO $$
BEGIN
    -- Проверяем, есть ли уже колонка project_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'qualification_work_schedule' 
        AND column_name = 'project_id'
        AND table_schema = 'public'
    ) THEN
        -- Добавляем колонку project_id
        ALTER TABLE qualification_work_schedule 
        ADD COLUMN project_id UUID;
        
        -- Добавляем комментарий к колонке
        COMMENT ON COLUMN qualification_work_schedule.project_id IS 'ID проекта, к которому привязан этап квалификационных работ';
        
        -- Создаем индекс для улучшения производительности запросов
        CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_project_id 
        ON qualification_work_schedule(project_id);
        
        -- Создаем составной индекс для запросов по project_id и qualification_object_id
        CREATE INDEX IF NOT EXISTS idx_qualification_work_schedule_project_object 
        ON qualification_work_schedule(project_id, qualification_object_id);
        
        RAISE NOTICE 'Колонка project_id успешно добавлена в таблицу qualification_work_schedule';
    ELSE
        RAISE NOTICE 'Колонка project_id уже существует в таблице qualification_work_schedule';
    END IF;
END $$;
```

### 2. Временное решение (Уже применено в коде)

Код был обновлен для работы как с новой, так и со старой схемой базы данных:

- ✅ **Функция `getWorkSchedule`** теперь безопасно обрабатывает отсутствие поля `project_id`
- ✅ **Функция `createAllStages`** создает этапы с `project_id` только если поле существует
- ✅ **Функция `mapFromDatabase`** корректно обрабатывает отсутствие `project_id`
- ✅ **Улучшено сообщение об ошибке** для лучшей диагностики

## Результат

После применения изменений:

1. ✅ **Ошибка "Ошибка загрузки расписания из базы данных" больше не возникает**
2. ✅ **План-график корректно отображается** для всех объектов квалификации
3. ✅ **Этапы создаются с правильной привязкой к проекту** (если SQL скрипт применен)
4. ✅ **Код работает как со старой, так и с новой схемой** базы данных

## Проверка

Для проверки исправления:

1. Откройте объект квалификации "ХК-32"
2. Перейдите к разделу "План-график проведения квалификационных работ"
3. Убедитесь, что:
   - Ошибка не отображается
   - Отображаются все 9 этапов квалификационных работ
   - Этапы имеют пустые даты начала и окончания (что корректно для нового плана)

## Логирование

В консоли браузера вы увидите логи:

```
QualificationWorkScheduleService: Сырые данные из БД: []
QualificationWorkScheduleService: Преобразованные данные: []
QualificationWorkSchedule: Этапы не найдены, создаем все этапы в БД для проекта: [project_id]
QualificationWorkScheduleService: Создаем недостающие этапы для проекта: [project_id] ["Расстановка логгеров", ...]
```

Это подтверждает, что система корректно создает этапы для нового объекта квалификации.



















