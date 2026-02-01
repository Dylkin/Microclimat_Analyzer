# Восстановление поля "Дата договора"

## Выполненные изменения

Поле "Дата договора" было восстановлено в компоненте редактирования полей договора.

### Изменения в файле `src/components/contract/ContractFields.tsx`:

#### 1. **Восстановлено сохранение поля contractDate** (строки 48-50):
```typescript
if (contractDate !== (project.contractDate ? project.contractDate.toISOString().split('T')[0] : '')) {
  updateData.contractDate = contractDate ? new Date(contractDate) : null;
}
```

#### 2. **Восстановлено поле ввода даты в режиме редактирования** (строки 114-128):
```typescript
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

#### 3. **Восстановлено отображение даты в режиме просмотра** (строки 176-184):
```typescript
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

## Важно! Требуется выполнить миграцию базы данных

**Перед использованием поля "Дата договора" необходимо выполнить миграцию базы данных:**

### Шаг 1: Проверьте наличие поля в базе данных
Выполните SQL скрипт `check_contract_date_field.sql` в Supabase SQL Editor:

```sql
-- Проверяем структуру таблицы projects
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем, есть ли поле contract_date
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND table_schema = 'public' 
  AND column_name = 'contract_date';
```

### Шаг 2: Если поле отсутствует, выполните миграцию
Выполните SQL скрипт `add_contract_date_manual.sql` в Supabase SQL Editor:

```sql
-- Добавляем поле contract_date если его нет
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';
```

## Функциональность

После выполнения миграции поле "Дата договора" будет:

### В режиме просмотра:
- Отображать текущую дату договора в формате "ДД.ММ.ГГГГ"
- Показывать "Не указана" если дата не установлена
- Позволять перейти в режим редактирования по кнопке "Редактировать"

### В режиме редактирования:
- Предоставлять поле выбора даты (date picker)
- Показывать иконку календаря
- Сохранять изменения в базу данных при нажатии "Сохранить"
- Отменять изменения при нажатии "Отмена"

## Тестирование

1. **Выполните миграцию базы данных** (если еще не выполнена)
2. **Откройте страницу "Согласование договора"**
3. **Найдите блок "Поля договора"** в разделе "Согласование документов"
4. **Проверьте режим просмотра**: поле "Дата договора" должно отображаться
5. **Нажмите "Редактировать"**: должно появиться поле выбора даты
6. **Выберите дату и сохраните**: изменения должны сохраниться в базу данных
7. **Проверьте отображение**: дата должна отображаться в правильном формате

## Возможные ошибки

Если при сохранении возникает ошибка:
```
Could not find the 'contract_date' column of 'projects' in the schema cache
```

Это означает, что миграция не была выполнена. Выполните SQL скрипт `add_contract_date_manual.sql` в Supabase SQL Editor.

## Файлы

- `src/components/contract/ContractFields.tsx` - основной компонент с восстановленной функциональностью
- `check_contract_date_field.sql` - скрипт для проверки наличия поля
- `add_contract_date_manual.sql` - скрипт для добавления поля
- `supabase/migrations/20250101190000_add_contract_date.sql` - миграция Supabase

## Статус

✅ **Поле "Дата договора" восстановлено в коде**
⏳ **Требуется выполнить миграцию базы данных**
✅ **Проект собирается без ошибок**



















