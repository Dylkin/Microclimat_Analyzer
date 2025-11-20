# Диагностика проблемы с сохранением/загрузкой дат этапов

## 🚨 **Проблема**

Информация о завершении этапа (кто завершил, когда) сохраняется и отображается корректно, но есть проблема с сохранением или загрузкой дат этапов (startDate, endDate).

## 🔍 **Добавленное логирование**

### **1. В `qualificationWorkScheduleService.ts`:**

**Функция `mapFromDatabase`:**
```typescript
console.log('QualificationWorkScheduleService: mapFromDatabase для этапа:', data.stage_name, {
  raw: {
    start_date: data.start_date,        // ✅ Добавлено
    end_date: data.end_date,            // ✅ Добавлено
    is_completed: data.is_completed,
    completed_at: data.completed_at,
    completed_by: data.completed_by,
    cancelled_at: data.cancelled_at,
    cancelled_by: data.cancelled_by
  },
  mapped: {
    startDate: mapped.startDate,        // ✅ Добавлено
    endDate: mapped.endDate,            // ✅ Добавлено
    isCompleted: mapped.isCompleted,
    completedAt: mapped.completedAt,
    completedBy: mapped.completedBy,
    cancelledAt: mapped.cancelledAt,
    cancelledBy: mapped.cancelledBy
  }
});
```

**Функция `updateWorkStage`:**
```typescript
console.log('QualificationWorkScheduleService: updateWorkStage - данные для сохранения:', {
  stageId,
  qualificationObjectId,
  stageData: {
    stageName: stageData.stageName,
    startDate: stageData.startDate,     // ✅ Добавлено
    endDate: stageData.endDate,         // ✅ Добавлено
    isCompleted: stageData.isCompleted,
    completedAt: stageData.completedAt,
    completedBy: stageData.completedBy,
    cancelledAt: stageData.cancelledAt,
    cancelledBy: stageData.cancelledBy
  }
});
```

### **2. В `QualificationWorkSchedule.tsx`:**

**Функция `loadSchedule`:**
```typescript
const convertedStages = savedStages.map(stage => {
  console.log('QualificationWorkSchedule: Преобразование этапа:', stage.stageName, {
    rawStartDate: stage.startDate,      // ✅ Добавлено
    rawEndDate: stage.endDate,          // ✅ Добавлено
    startDateType: typeof stage.startDate,  // ✅ Добавлено
    endDateType: typeof stage.endDate       // ✅ Добавлено
  });
  // ...
});
```

**Функции изменения дат:**
```typescript
const handleDateChange = (stageId: string, field: 'startDate' | 'endDate', value: string) => {
  console.log('QualificationWorkSchedule: handleDateChange:', { stageId, field, value }); // ✅ Добавлено
  // ...
};

const handleSingleDateChange = (stageId: string, value: string) => {
  console.log('QualificationWorkSchedule: handleSingleDateChange:', { stageId, value }); // ✅ Добавлено
  // ...
};
```

## 📋 **Инструкции по диагностике**

### **Шаг 1: Проверьте структуру таблицы**

Выполните SQL скрипт `check_qualification_work_schedule.sql`:

```sql
-- Проверка структуры таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'qualification_work_schedule' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Ожидаемый результат:**
- `start_date` - тип `date` или `timestamp`
- `end_date` - тип `date` или `timestamp`
- `is_nullable` - `YES` (должны быть nullable)

### **Шаг 2: Проверьте данные в таблице**

```sql
SELECT 
    id,
    qualification_object_id,
    stage_name,
    start_date,
    end_date,
    is_completed,
    completed_at,
    completed_by
FROM public.qualification_work_schedule
ORDER BY qualification_object_id, created_at;
```

### **Шаг 3: Протестируйте сохранение дат**

1. **Откройте план график** для объекта квалификации
2. **Заполните даты** для любого этапа
3. **Проверьте логи в консоли:**

**Ожидаемые логи при изменении даты:**
```
QualificationWorkSchedule: handleDateChange: {stageId: "temp-stage-1", field: "startDate", value: "2025-01-15"}
```

**Ожидаемые логи при завершении этапа:**
```
QualificationWorkScheduleService: updateWorkStage - данные для сохранения: {
  stageData: {
    startDate: "2025-01-15",
    endDate: "2025-01-15",
    isCompleted: true,
    ...
  }
}
```

**Ожидаемые логи при загрузке:**
```
QualificationWorkScheduleService: mapFromDatabase для этапа: Расстановка логгеров {
  raw: {
    start_date: "2025-01-15",
    end_date: "2025-01-15",
    ...
  },
  mapped: {
    startDate: "2025-01-15",
    endDate: "2025-01-15",
    ...
  }
}
```

### **Шаг 4: Проверьте отображение дат**

После загрузки страницы проверьте:

1. **Отображаются ли даты** в полях ввода
2. **Сохраняются ли даты** при перезагрузке страницы
3. **Показываются ли даты** в информации о завершении этапа

## 🔧 **Возможные проблемы и решения**

### **Проблема 1: Даты не сохраняются в БД**

**Симптомы:**
- Логи показывают `startDate: "2025-01-15"` при сохранении
- В БД `start_date` остается `null`

**Возможные причины:**
1. **Неправильный тип данных** в БД
2. **Ошибка в SQL запросе** UPDATE
3. **Проблема с RLS** (Row Level Security)

**Решение:**
```sql
-- Проверьте тип данных
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'qualification_work_schedule' AND column_name = 'start_date';

-- Если нужно изменить тип
ALTER TABLE public.qualification_work_schedule 
ALTER COLUMN start_date TYPE date USING start_date::date;
```

### **Проблема 2: Даты не загружаются из БД**

**Симптомы:**
- В БД даты есть
- При загрузке `rawStartDate: null`

**Возможные причины:**
1. **Проблема с SELECT запросом**
2. **Неправильный маппинг** в `mapFromDatabase`
3. **Проблема с RLS**

**Решение:**
```sql
-- Проверьте данные напрямую
SELECT start_date, end_date FROM public.qualification_work_schedule 
WHERE qualification_object_id = 'your-object-id';
```

### **Проблема 3: Даты отображаются как пустые строки**

**Симптомы:**
- `rawStartDate: null`
- `startDate: ""` (пустая строка)

**Причина:**
В `loadSchedule` используется `stage.startDate || ''`, что преобразует `null` в пустую строку.

**Решение:**
Изменить логику преобразования:
```typescript
startDate: stage.startDate || undefined,  // Вместо ''
endDate: stage.endDate || undefined,      // Вместо ''
```

## 📊 **Анализ логов**

### **Успешное сохранение дат:**
```
QualificationWorkSchedule: handleDateChange: {stageId: "temp-stage-1", field: "startDate", value: "2025-01-15"}
QualificationWorkScheduleService: updateWorkStage - данные для сохранения: {
  stageData: { startDate: "2025-01-15", endDate: "2025-01-15", ... }
}
QualificationWorkScheduleService: updateWorkStage - данные для UPDATE: {
  start_date: "2025-01-15", end_date: "2025-01-15", ...
}
```

### **Успешная загрузка дат:**
```
QualificationWorkScheduleService: mapFromDatabase для этапа: Расстановка логгеров {
  raw: { start_date: "2025-01-15", end_date: "2025-01-15" },
  mapped: { startDate: "2025-01-15", endDate: "2025-01-15" }
}
QualificationWorkSchedule: Преобразование этапа: Расстановка логгеров {
  rawStartDate: "2025-01-15", rawEndDate: "2025-01-15"
}
```

## 🎯 **Следующие шаги**

1. **Выполните диагностику** по инструкциям выше
2. **Проверьте логи** в консоли браузера
3. **Выполните SQL запросы** для проверки БД
4. **Сообщите результаты** для дальнейшего анализа

## 📁 **Созданные файлы**

- `check_qualification_work_schedule.sql` - SQL скрипт для диагностики
- `README_Диагностика_проблемы_с_датами_этапов.md` - данная документация

**После выполнения диагностики мы сможем точно определить причину проблемы и исправить её!** 🔍



















