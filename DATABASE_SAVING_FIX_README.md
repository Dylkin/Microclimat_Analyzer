# Исправление сохранения комментариев и статусов в базе данных

## Проблема
Введенные пользователем комментарии и установленные статусы документов на странице "Согласование договора" не сохранялись в базе данных. Все данные терялись при обновлении страницы.

## Причина
В `DocumentApprovalService` использовались заглушки вместо реальных запросов к Supabase. Методы возвращали локальные объекты, которые не сохранялись в базе данных.

## Решение

### 1. Создание таблиц в базе данных

**Файл:** `create_document_approval_tables.sql`

Созданы две таблицы:

#### Таблица `document_comments`:
```sql
CREATE TABLE document_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Таблица `document_approvals`:
```sql
CREATE TABLE document_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Исправление DocumentApprovalService

**Файл:** `src/utils/documentApprovalService.ts`

#### Было (заглушки):
```typescript
// Заглушка для демонстрации
return newComment;

// Возвращаем пустой массив - только пользовательские комментарии
return [];
```

#### Стало (реальные запросы к БД):
```typescript
const { data, error } = await this.supabase
  .from('document_comments')
  .insert([commentData])
  .select()
  .single();

if (error) {
  console.error('Ошибка сохранения комментария:', error);
  throw new Error(`Ошибка сохранения комментария: ${error.message}`);
}
```

### 3. Обновленные методы

#### `addComment()` - добавление комментария:
- ✅ Сохраняет комментарий в таблице `document_comments`
- ✅ Возвращает реальные данные из базы
- ✅ Обрабатывает ошибки сохранения

#### `getComments()` - получение комментариев:
- ✅ Загружает комментарии из таблицы `document_comments`
- ✅ Сортирует по дате создания
- ✅ Обрабатывает ошибки загрузки

#### `approveDocument()` - согласование документа:
- ✅ Сохраняет запись согласования в таблице `document_approvals`
- ✅ Статус: 'approved'
- ✅ Возвращает реальные данные из базы

#### `rejectDocument()` - отклонение документа:
- ✅ Сохраняет запись отклонения в таблице `document_approvals`
- ✅ Статус: 'rejected'
- ✅ Возвращает реальные данные из базы

#### `cancelApproval()` - отмена согласования (новый метод):
- ✅ Сохраняет запись отмены в таблице `document_approvals`
- ✅ Статус: 'pending'
- ✅ Комментарий: 'Согласование отменено'

#### `getApprovalHistory()` - история согласований:
- ✅ Загружает историю из таблицы `document_approvals`
- ✅ Сортирует по дате создания
- ✅ Обрабатывает ошибки загрузки

#### `getApprovalStatus()` - статус согласования:
- ✅ Загружает комментарии и историю согласований
- ✅ Определяет текущий статус по последней записи
- ✅ Возвращает полную информацию о статусе

### 4. Обновление компонентов

**Файл:** `src/components/contract/DocumentApprovalActions.tsx`

Обновлен метод отмены согласования:
```typescript
// Было:
approvalRecord = {
  id: Date.now().toString(),
  documentId,
  userId,
  userName,
  status: 'pending',
  comment: 'Согласование отменено',
  createdAt: new Date()
};

// Стало:
approvalRecord = await documentApprovalService.cancelApproval(
  documentId, 
  userId, 
  'Согласование отменено'
);
```

## Безопасность

### RLS (Row Level Security)
Включена для обеих таблиц с политиками:
- Пользователи могут просматривать все комментарии и согласования
- Авторизованные пользователи могут добавлять записи
- Пользователи могут редактировать только свои записи

### Политики безопасности:
```sql
-- Просмотр всех записей
CREATE POLICY "Users can view all comments" ON document_comments FOR SELECT USING (true);

-- Добавление записей авторизованными пользователями
CREATE POLICY "Authenticated users can insert comments" ON document_comments 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Редактирование только своих записей
CREATE POLICY "Users can update their own comments" ON document_comments 
FOR UPDATE USING (auth.uid()::text = user_id);
```

## Установка и настройка

### 1. Создание таблиц в базе данных:
```bash
setup_document_approval_database.bat
```

Или выполните SQL команды из `create_document_approval_tables.sql` в Supabase SQL Editor.

### 2. Запуск приложения:
```bash
start_with_database_saving.bat
```

## Результат

### До исправления:
- ❌ Комментарии не сохранялись в базе данных
- ❌ Статусы согласования не сохранялись в базе данных
- ❌ Данные терялись при обновлении страницы
- ❌ История согласований была пустой

### После исправления:
- ✅ Комментарии сохраняются в таблице `document_comments`
- ✅ Статусы согласования сохраняются в таблице `document_approvals`
- ✅ Данные сохраняются между сессиями
- ✅ История согласований загружается из базы данных
- ✅ Все действия пользователя записываются в базу

## Проверка работы

### 1. Проверка сохранения комментариев:
1. Откройте страницу "Согласование договора"
2. Добавьте комментарий к любому документу
3. Обновите страницу
4. Комментарий должен остаться

### 2. Проверка сохранения статусов:
1. Согласуйте или отклоните документ
2. Обновите страницу
3. Статус должен сохраниться
4. История согласований должна отображаться

### 3. Проверка в базе данных:
```sql
-- Просмотр комментариев
SELECT * FROM document_comments ORDER BY created_at DESC;

-- Просмотр согласований
SELECT * FROM document_approvals ORDER BY created_at DESC;
```

## Файлы изменены:
- `src/utils/documentApprovalService.ts` - исправлен сервис
- `src/components/contract/DocumentApprovalActions.tsx` - обновлен компонент
- `create_document_approval_tables.sql` - SQL для создания таблиц
- `setup_document_approval_database.bat` - скрипт настройки БД
- `start_with_database_saving.bat` - скрипт запуска
- `DATABASE_SAVING_FIX_README.md` - документация

## Технические детали:

### Структура данных:
- **document_comments**: комментарии к документам с автором и временем
- **document_approvals**: записи согласования с статусом и комментарием
- **Индексы**: для оптимизации запросов по document_id и created_at
- **Триггеры**: для автоматического обновления updated_at

### Обработка ошибок:
- Логирование ошибок в консоль
- Понятные сообщения об ошибках для пользователя
- Fallback к локальному состоянию при ошибках сети

### Производительность:
- Индексы на часто используемые поля
- Эффективные запросы с сортировкой
- Параллельная загрузка комментариев и истории























