# Процесс сохранения и отображения данных в блоке "Поля договора"

## Обзор архитектуры

Блок "Поля договора" состоит из нескольких компонентов, которые работают вместе для загрузки, отображения и сохранения данных о договоре проекта.

## Компоненты системы

### 1. ContractFields.tsx
**Основной компонент** для работы с полями договора.

**Состояние компонента:**
```typescript
const [contractNumber, setContractNumber] = useState(project.contractNumber || '');
const [contractDate, setContractDate] = useState(
  project.contractDate ? project.contractDate.toISOString().split('T')[0] : ''
);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 2. projectService.ts
**Сервис** для работы с данными проектов в Supabase.

### 3. DocumentApproval.tsx
**Родительский компонент**, который интегрирует ContractFields.

## Процесс загрузки данных

### Шаг 1: Инициализация компонента
```typescript
// ContractFields.tsx - строки 19-22
const [contractNumber, setContractNumber] = useState(project.contractNumber || '');
const [contractDate, setContractDate] = useState(
  project.contractDate ? project.contractDate.toISOString().split('T')[0] : ''
);
```

### Шаг 2: Обновление при изменении проекта
```typescript
// ContractFields.tsx - строки 27-37
useEffect(() => {
  console.log('ContractFields: Обновление данных проекта', {
    projectId: project.id,
    contractNumber: project.contractNumber,
    contractDate: project.contractDate,
    project: project
  });
  
  setContractNumber(project.contractNumber || '');
  setContractDate(project.contractDate ? project.contractDate.toISOString().split('T')[0] : '');
}, [project.id, project.contractNumber, project.contractDate]);
```

### Шаг 3: Загрузка данных из базы
```typescript
// projectService.ts - строки 67-96
const { data: projectData, error: projectError } = await this.supabase
  .from('projects')
  .select('*')
  .eq('id', id)
  .single();

// Преобразование данных из базы в формат Project
const project: Project = {
  id: projectData.id,
  name: projectData.name,
  description: projectData.description,
  contractorId: projectData.contractor_id,
  contractNumber: projectData.contract_number,        // ← contract_number из БД
  contractDate: projectData.contract_date ? new Date(projectData.contract_date) : undefined, // ← contract_date из БД
  status: projectData.status,
  // ... остальные поля
};
```

## Процесс отображения данных

### Режим просмотра (isEditing = false)
```typescript
// ContractFields.tsx - строки 163-197
return (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <FileText className="w-5 h-5 text-blue-500" />
        <h4 className="font-medium text-gray-900">Поля договора</h4>
      </div>
      <button onClick={() => onEditToggle?.(true)}>
        Редактировать
      </button>
    </div>

    <div className="space-y-3">
      <div>
        <span className="text-sm font-medium text-gray-700">№ договора:</span>
        <p className="text-sm text-gray-900 mt-1">
          {project.contractNumber || 'Не указан'}  {/* ← Отображение номера договора */}
        </p>
      </div>
      
      <div>
        <span className="text-sm font-medium text-gray-700">Дата договора:</span>
        <p className="text-sm text-gray-900 mt-1">
          {project.contractDate 
            ? project.contractDate.toLocaleDateString('ru-RU')  /* ← Отображение даты */
            : 'Не указана'
          }
        </p>
      </div>
    </div>
  </div>
);
```

### Режим редактирования (isEditing = true)
```typescript
// ContractFields.tsx - строки 95-160
return (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    {/* ... заголовок ... */}
    
    <div className="space-y-4">
      <div>
        <label htmlFor="contractNumber">№ договора</label>
        <input
          type="text"
          id="contractNumber"
          value={contractNumber}  {/* ← Локальное состояние */}
          onChange={(e) => setContractNumber(e.target.value)}
          placeholder="Введите номер договора"
        />
      </div>

      <div>
        <label htmlFor="contractDate">Дата договора</label>
        <input
          type="date"
          id="contractDate"
          value={contractDate}  {/* ← Локальное состояние */}
          onChange={(e) => setContractDate(e.target.value)}
        />
      </div>
    </div>

    <div className="flex items-center justify-end space-x-3 mt-4">
      <button onClick={handleCancel}>Отмена</button>
      <button onClick={handleSave}>Сохранить</button>
    </div>
  </div>
);
```

## Процесс сохранения данных

### Шаг 1: Обработка нажатия "Сохранить"
```typescript
// ContractFields.tsx - строки 39-86
const handleSave = async () => {
  if (!projectService.isAvailable()) {
    setError('Сервис проектов недоступен');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const updateData: any = {};
    
    // Проверяем изменения в номере договора
    if (contractNumber !== (project.contractNumber || '')) {
      updateData.contractNumber = contractNumber || null;
    }
    
    // Проверяем изменения в дате договора
    if (contractDate !== (project.contractDate ? project.contractDate.toISOString().split('T')[0] : '')) {
      updateData.contractDate = contractDate ? new Date(contractDate) : null;
    }

    console.log('ContractFields: Сохранение полей договора', {
      projectId: project.id,
      updateData,
      originalContractNumber: project.contractNumber,
      originalContractDate: project.contractDate,
      newContractNumber: contractNumber,
      newContractDate: contractDate
    });

    // Если нет изменений, выходим
    if (Object.keys(updateData).length === 0) {
      console.log('ContractFields: Нет изменений для сохранения');
      onEditToggle?.(false);
      return;
    }

    // Вызываем сервис для обновления
    const updatedProject = await projectService.updateProject(project.id, updateData);
    
    // Обновляем родительский компонент
    onUpdate(updatedProject);
    onEditToggle?.(false);
  } catch (error) {
    console.error('Ошибка обновления полей договора:', error);
    setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
  } finally {
    setLoading(false);
  }
};
```

### Шаг 2: Обновление в базе данных
```typescript
// projectService.ts - строки 353-424
async updateProject(id: string, updates: UpdateProjectData): Promise<Project> {
  if (!this.supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    const updateData: any = {};

    // Преобразуем данные для базы
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.contractNumber !== undefined) updateData.contract_number = updates.contractNumber;
    if (updates.contractDate !== undefined) updateData.contract_date = updates.contractDate.toISOString().split('T')[0];
    if (updates.status !== undefined) updateData.status = updates.status;

    console.log('ProjectService: Обновление проекта', {
      projectId: id,
      updates,
      updateData
    });

    // Выполняем UPDATE запрос
    const { data, error } = await this.supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select();

    console.log('ProjectService: Результат обновления', { data, error });

    if (error) {
      console.error('Ошибка обновления проекта:', error);
      throw new Error(`Ошибка обновления проекта: ${error.message}`);
    }

    // Возвращаем обновленный проект
    const projects = await this.getAllProjects();
    const updatedProject = projects.find(p => p.id === id);
    
    if (!updatedProject) {
      throw new Error('Не удалось найти обновленный проект');
    }

    return updatedProject;
  } catch (error) {
    console.error('Ошибка при обновлении проекта:', error);
    throw error;
  }
}
```

## Структура базы данных

### Таблица projects
```sql
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id),
  contract_number text,           -- ← Номер договора
  contract_date date,             -- ← Дата договора
  status project_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

## Поток данных

### 1. Загрузка (Load Flow)
```
База данных (projects) 
  → projectService.getProjectById() 
  → Project объект 
  → ContractFields компонент 
  → Локальное состояние (contractNumber, contractDate) 
  → UI отображение
```

### 2. Сохранение (Save Flow)
```
Пользователь вводит данные 
  → Локальное состояние (contractNumber, contractDate) 
  → handleSave() 
  → projectService.updateProject() 
  → UPDATE запрос к БД 
  → Обновленный Project объект 
  → onUpdate() callback 
  → Родительский компонент обновляется
```

## Отладочная информация

### Логи в консоли браузера
1. **При загрузке данных:**
   ```
   ContractFields: Обновление данных проекта {
     projectId: "uuid",
     contractNumber: "12345",
     contractDate: "2024-01-01",
     project: { ... }
   }
   ```

2. **При сохранении:**
   ```
   ContractFields: Сохранение полей договора {
     projectId: "uuid",
     updateData: { contractNumber: "12345", contractDate: "2024-01-01" },
     originalContractNumber: null,
     originalContractDate: null,
     newContractNumber: "12345",
     newContractDate: "2024-01-01"
   }
   ```

3. **В projectService:**
   ```
   ProjectService: Обновление проекта {
     projectId: "uuid",
     updates: { contractNumber: "12345", contractDate: Date },
     updateData: { contract_number: "12345", contract_date: "2024-01-01" }
   }
   
   ProjectService: Результат обновления { data: [...], error: null }
   ```

## Возможные проблемы

### 1. Поле contract_date отсутствует в БД
**Симптом:** Ошибка "Could not find the 'contract_date' column"
**Решение:** Выполнить миграцию `check_contract_date_quick.sql`

### 2. Данные не загружаются
**Симптом:** Поля показывают "Не указан" и "Не указана"
**Диагностика:** Проверить логи в консоли браузера

### 3. Данные не сохраняются
**Симптом:** После сохранения изменения не отображаются
**Диагностика:** Проверить логи projectService и ошибки в консоли

### 4. Проблемы с RLS
**Симптом:** Ошибки доступа к таблице projects
**Решение:** Проверить политики RLS для таблицы projects

## Интеграция с родительским компонентом

### DocumentApproval.tsx
```typescript
// Строки 7, 13, 33
import { ContractFields } from './ContractFields';

interface DocumentApprovalProps {
  project?: Project;
  onProjectUpdate?: (updatedProject: Project) => void;
}

// Использование компонента
<ContractFields
  project={project}
  onUpdate={onProjectUpdate || (() => {})}
  isEditing={isEditingContractFields}
  onEditToggle={setIsEditingContractFields}
/>
```

### ContractNegotiation.tsx
```typescript
// Передача обновленного проекта
const [currentProject, setCurrentProject] = useState<Project>(project);

<DocumentApproval
  project={currentProject}
  onProjectUpdate={setCurrentProject}  // ← Обновление состояния
  // ... другие пропсы
/>
```

## Заключение

Блок "Поля договора" использует стандартный паттерн React для работы с формами:
1. **Локальное состояние** для редактирования
2. **useEffect** для синхронизации с пропсами
3. **Callback функции** для обновления родительского компонента
4. **Сервисный слой** для работы с API
5. **Отладочное логирование** для диагностики

Все изменения проходят через полный цикл: UI → Локальное состояние → Сервис → База данных → Обновленный объект → UI.



















