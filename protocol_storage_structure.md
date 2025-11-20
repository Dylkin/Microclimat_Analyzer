# Структура хранения протоколов квалификации

## 📁 Supabase Storage

### Текущая структура:
```
documents/
├── project-documents/
│   ├── {projectId}_commercial_offer_{timestamp}.pdf
│   ├── {projectId}_contract_{timestamp}.pdf
│   └── {projectId}_qualification_protocol_{objectType}_{timestamp}.pdf
```

### Рекомендуемая структура:
```
documents/
├── projects/
│   └── {projectId}/
│       ├── commercial-offers/
│       │   └── {timestamp}.pdf
│       ├── contracts/
│       │   └── {timestamp}.pdf
│       └── qualification-protocols/
│           ├── {objectType}/
│           │   └── {timestamp}.pdf
│           └── metadata.json
```

## 🗄️ База данных

### Текущая таблица: `project_documents`
```sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  document_type document_type,
  file_name TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

### Рекомендуемая структура:

#### 1. Обновить enum `document_type`:
```sql
ALTER TYPE document_type ADD VALUE 'qualification_protocol';
```

#### 2. Добавить таблицу для протоколов квалификации:
```sql
CREATE TABLE qualification_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  qualification_object_id UUID REFERENCES qualification_objects(id),
  object_type TEXT NOT NULL, -- 'помещение', 'автомобиль', 'холодильник', etc.
  protocol_document_id UUID REFERENCES project_documents(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Добавить индексы:
```sql
CREATE INDEX idx_qualification_protocols_project_id ON qualification_protocols(project_id);
CREATE INDEX idx_qualification_protocols_object_type ON qualification_protocols(object_type);
CREATE INDEX idx_qualification_protocols_status ON qualification_protocols(status);
```

## 🔄 Логика работы

### Загрузка протокола:
1. Пользователь выбирает файл для типа объекта
2. Файл загружается в Storage: `documents/projects/{projectId}/qualification-protocols/{objectType}/{timestamp}.pdf`
3. Создается запись в `project_documents`
4. Создается запись в `qualification_protocols`

### Получение протоколов:
1. Запрос к `qualification_protocols` по `project_id`
2. JOIN с `project_documents` для получения файлов
3. Группировка по `object_type`

## 🎯 Преимущества рекомендуемой структуры:

1. **Организация:** Четкое разделение по типам документов
2. **Масштабируемость:** Легко добавлять новые типы протоколов
3. **Метаданные:** Дополнительная информация о протоколах
4. **Статусы:** Отслеживание процесса согласования
5. **Связи:** Прямая связь с объектами квалификации
6. **Производительность:** Оптимизированные запросы с индексами

## 🚀 Миграция:

### Этап 1: Обновить enum
```sql
ALTER TYPE document_type ADD VALUE 'qualification_protocol';
```

### Этап 2: Создать новую таблицу
```sql
-- Создать таблицу qualification_protocols
```

### Этап 3: Мигрировать существующие данные
```sql
-- Перенести существующие протоколы в новую структуру
```

### Этап 4: Обновить приложение
- Изменить логику загрузки
- Обновить запросы к базе данных
- Изменить структуру Storage


























