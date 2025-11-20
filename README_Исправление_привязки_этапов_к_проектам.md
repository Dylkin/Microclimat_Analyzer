# Исправление привязки этапов квалификационных работ к проектам

## Проблема

Данные из блока "План-график проведения квалификационных работ" не были привязаны к конкретным проектам. При создании нового проекта квалификации в объектах квалификации могли отображаться данные из предыдущего проекта.

## Решение

Добавлена привязка этапов квалификационных работ к конкретным проектам через поле `project_id` в таблице `qualification_work_schedule`.

## Изменения в коде

### 1. Обновлен интерфейс `QualificationWorkStage`

**Файл:** `src/utils/qualificationWorkScheduleService.ts`

```typescript
export interface QualificationWorkStage {
  id: string;
  qualificationObjectId: string;
  projectId?: string; // Добавлена привязка к проекту
  stageName: string;
  stageDescription: string;
  // ... остальные поля
}
```

### 2. Обновлена функция `getWorkSchedule`

Теперь функция принимает `projectId` и фильтрует этапы по проекту:

```typescript
async getWorkSchedule(qualificationObjectId: string, projectId?: string): Promise<QualificationWorkStage[]>
```

### 3. Обновлена функция `createAllStages`

Функция теперь создает этапы с привязкой к конкретному проекту:

```typescript
async createAllStages(qualificationObjectId: string, projectId?: string): Promise<QualificationWorkStage[]>
```

### 4. Обновлен компонент `QualificationWorkSchedule`

Компонент теперь передает `projectId` во все вызовы сервиса:

```typescript
const savedStages = await qualificationWorkScheduleService.getWorkSchedule(qualificationObjectId, projectId);
const allStages = await qualificationWorkScheduleService.createAllStages(qualificationObjectId, projectId);
```

## Изменения в базе данных

### SQL скрипт для добавления поля `project_id`

**Файл:** `add_project_id_to_qualification_work_schedule.sql`

```sql
-- Добавление поля project_id в таблицу qualification_work_schedule
ALTER TABLE qualification_work_schedule 
ADD COLUMN project_id UUID;

-- Создание индексов для улучшения производительности
CREATE INDEX idx_qualification_work_schedule_project_id 
ON qualification_work_schedule(project_id);

CREATE INDEX idx_qualification_work_schedule_project_object 
ON qualification_work_schedule(project_id, qualification_object_id);
```

## Инструкции по применению

### 1. Выполните SQL скрипт

Запустите файл `add_project_id_to_qualification_work_schedule.sql` в вашей базе данных Supabase:

```bash
# Через Supabase Dashboard:
# 1. Откройте Supabase Dashboard
# 2. Перейдите в раздел "SQL Editor"
# 3. Скопируйте и выполните содержимое файла add_project_id_to_qualification_work_schedule.sql
```

### 2. Проверьте результат

После выполнения скрипта проверьте, что поле `project_id` добавлено:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'qualification_work_schedule' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Результат

После применения изменений:

1. ✅ **Этапы квалификационных работ привязаны к конкретным проектам**
2. ✅ **При создании нового проекта создаются новые этапы для этого проекта**
3. ✅ **Данные не смешиваются между разными проектами**
4. ✅ **Каждый проект имеет свои собственные этапы квалификационных работ**

## Тестирование

1. Создайте новый проект квалификации
2. Добавьте объект квалификации
3. Проверьте, что отображаются все 9 этапов
4. Создайте еще один проект с другим объектом квалификации
5. Убедитесь, что этапы не смешиваются между проектами

## Логирование

В консоли браузера вы увидите логи:

```
QualificationWorkScheduleService: Существующие этапы для проекта: [project_id] Set(6) {...}
QualificationWorkScheduleService: Создаем недостающие этапы для проекта: [project_id] ["Снятие логгеров", "Проверка наличия документации", "Документы по испытанию"]
QualificationWorkScheduleService: Созданы недостающие этапы: 3
QualificationWorkScheduleService: Итого этапов: 9
```

Это подтверждает, что этапы создаются с правильной привязкой к проекту.



















