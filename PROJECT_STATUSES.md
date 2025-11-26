# Список статусов проектов

## Все доступные статусы проектов

### 1. `contract_negotiation` - Согласование договора
- **Описание**: Начальный этап проекта, происходит согласование договора с контрагентом
- **Цвет**: Желтый (`bg-yellow-100 text-yellow-800`)
- **Иконка**: Часы (Clock)
- **Действие**: Переход к странице согласования договора

### 2. `testing_execution` - Проведение испытаний
- **Описание**: Активный этап проведения испытаний объектов квалификации
- **Цвет**: Фиолетовый (`bg-purple-100 text-purple-800`)
- **Иконка**: Воспроизведение (Play)
- **Действие**: Переход к странице проведения испытаний

### 3. `report_preparation` - Подготовка отчета
- **Описание**: Этап подготовки отчета по результатам испытаний
- **Цвет**: Оранжевый (`bg-orange-100 text-orange-800`)
- **Иконка**: Документ (FileText)
- **Действие**: Переход к странице подготовки отчета

### 4. `report_approval` - Согласование отчета
- **Описание**: Этап согласования подготовленного отчета
- **Цвет**: Индиго (`bg-indigo-100 text-indigo-800`)
- **Иконка**: Часы (Clock)
- **Действие**: Переход к странице согласования отчета

### 5. `report_printing` - Печать отчета
- **Описание**: Финальный этап перед завершением - печать отчета
- **Цвет**: Зеленый (`bg-green-100 text-green-800`)
- **Иконка**: Принтер (Printer)
- **Действие**: Переход к странице печати отчета

### 6. `completed` - Завершен
- **Описание**: Проект успешно завершен
- **Цвет**: Серый (`bg-gray-100 text-gray-800`)
- **Иконка**: Галочка (CheckCircle)
- **Действие**: Нет доступных действий

## Последовательность статусов

Типичный жизненный цикл проекта:

```
contract_negotiation → testing_execution → 
report_preparation → report_approval → report_printing → completed
```

## Определение в коде

### TypeScript (`src/types/Project.ts`)
```typescript
export type ProjectStatus = 
  | 'contract_negotiation'
  | 'testing_execution'
  | 'report_preparation'
  | 'report_approval'
  | 'report_printing'
  | 'completed';
```

### База данных (PostgreSQL)
```sql
CREATE TYPE project_status AS ENUM (
  'contract_negotiation',
  'testing_execution',
  'report_preparation',
  'report_approval',
  'report_printing',
  'completed'
);
```

## Статус по умолчанию

При создании нового проекта используется статус: **`contract_negotiation`** (Согласование договора)

