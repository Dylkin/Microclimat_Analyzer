# Исправление ошибки "Could not find the 'contract_date' column"

## Проблема
При сохранении полей договора возникает ошибка:
```
Ошибка обновления проекта: Could not find the 'contract_date' column of 'projects' in the schema cache
```

## Причина
Поле `contract_date` не существует в таблице `projects` в базе данных. Миграция не была выполнена.

## Решение

### Шаг 1: Выполните миграцию базы данных
Выполните SQL скрипт `add_contract_date_manual.sql` в Supabase SQL Editor:

```sql
-- 1. Проверяем текущую структуру таблицы projects
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Добавляем поле contract_date если его нет
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;

-- 3. Добавляем комментарий к полю
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';

-- 4. Проверяем, что поле добавлено
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Проверяем, что таблица доступна для обновления
SELECT COUNT(*) as project_count FROM public.projects;
```

### Шаг 2: Включите функциональность в коде
После выполнения миграции раскомментируйте код в файле `src/components/contract/ContractFields.tsx`:

1. **В функции `handleSave`** (строки 48-51):
```typescript
// Раскомментируйте эти строки:
if (contractDate !== (project.contractDate ? project.contractDate.toISOString().split('T')[0] : '')) {
  updateData.contractDate = contractDate ? new Date(contractDate) : null;
}
```

2. **В режиме редактирования** (строки 115-130):
```typescript
// Раскомментируйте весь блок с полем ввода даты:
<div>
  <label htmlFor="contractDate" className="block text-sm font-medium text-gray-700 mb-1">
    Дата договора
  </label>
  <div className="relative">
    <input
      type="date"
      id="contractDate"
      value={contractDate}
      onChange={(e) => setContractDate(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
</div>
```

3. **В режиме просмотра** (строки 177-186):
```typescript
// Раскомментируйте блок отображения даты:
<div>
  <span className="text-sm font-medium text-gray-700">Дата договора:</span>
  <p className="text-sm text-gray-900 mt-1">
    {project.contractDate 
      ? project.contractDate.toLocaleDateString('ru-RU')
      : 'Не указана'
    }
  </p>
</div>
```

## Текущее состояние
- ✅ Поле "№ договора" работает корректно
- ⏸️ Поле "Дата договора" временно отключено до выполнения миграции
- ✅ Сохранение номера договора работает без ошибок

## После выполнения миграции
- ✅ Поле "№ договора" будет работать как раньше
- ✅ Поле "Дата договора" будет доступно для редактирования
- ✅ Оба поля будут сохраняться в базу данных

## Проверка результата
1. Выполните миграцию в Supabase SQL Editor
2. Раскомментируйте код в `ContractFields.tsx`
3. Перезапустите dev сервер: `npm run dev`
4. Откройте страницу "Согласование договора"
5. Проверьте, что поле "Дата договора" отображается и работает корректно

## Файлы для изменения
- `add_contract_date_manual.sql` - SQL скрипт для миграции
- `src/components/contract/ContractFields.tsx` - раскомментировать код после миграции



















