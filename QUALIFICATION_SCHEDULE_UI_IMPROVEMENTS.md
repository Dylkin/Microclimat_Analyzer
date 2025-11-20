# Улучшения интерфейса расписания квалификационных работ

## Внесенные изменения

### 1. Упрощение полей дат для определенных этапов

**Проблема:** Для всех этапов отображались два поля: "Дата начала" и "Дата окончания", что было избыточно для некоторых этапов.

**Решение:** Для этапов "Расстановка логгеров", "Испытание на восстановление температуры после открытия двери" и "Снятие логгеров" теперь отображается только одно поле "Дата".

#### Изменения в `QualificationWorkSchedule.tsx`:

1. **Добавлена функция проверки типа этапа:**
```typescript
const isSingleDateStage = (stageName: string) => {
  const singleDateStages = [
    'Расстановка логгеров',
    'Испытание на восстановление температуры после открытия двери',
    'Снятие логгеров'
  ];
  return singleDateStages.includes(stageName);
};
```

2. **Добавлена функция обработки единой даты:**
```typescript
const handleSingleDateChange = (stageId: string, value: string) => {
  setStages(prevStages => 
    prevStages.map(stage => 
      stage.id === stageId 
        ? { ...stage, startDate: value, endDate: value }
        : stage
    )
  );
};
```

3. **Условное отображение полей дат:**
```typescript
{isSingleDateStage(stage.name) ? (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Дата
    </label>
    <input
      type="date"
      value={stage.startDate}
      onChange={(e) => handleSingleDateChange(stage.id, e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      title={`Дата этапа: ${stage.name}`}
    />
  </div>
) : (
  // Обычные поля "Дата начала" и "Дата окончания"
)}
```

### 2. Добавление поля "Период проведения" в информацию о проекте

**Проблема:** Не было возможности увидеть общий период проведения квалификационных работ по всему проекту.

**Решение:** Добавлено поле "Период проведения" в блок "Информация о проекте", которое показывает самую раннюю и самую позднюю дату из всех объектов квалификации.

#### Создан новый сервис `projectPeriodService.ts`:

```typescript
export interface ProjectPeriod {
  projectId: string;
  earliestDate: string | null;
  latestDate: string | null;
  totalStages: number;
  completedStages: number;
}

class ProjectPeriodService {
  async getProjectPeriod(projectId: string): Promise<ProjectPeriod | null>
  formatPeriod(period: ProjectPeriod): string
}
```

**Функциональность сервиса:**
- Получает все объекты квалификации для проекта
- Загружает расписания для всех объектов
- Находит самую раннюю и самую позднюю даты
- Форматирует период для отображения

#### Изменения в `ProjectInfo.tsx`:

1. **Добавлены импорты и состояние:**
```typescript
import { projectPeriodService, ProjectPeriod } from '../../utils/projectPeriodService';

const [projectPeriod, setProjectPeriod] = useState<ProjectPeriod | null>(null);
const [loadingPeriod, setLoadingPeriod] = useState(false);
```

2. **Добавлена загрузка периода:**
```typescript
useEffect(() => {
  const loadProjectPeriod = async () => {
    if (!projectPeriodService.isAvailable()) return;
    
    setLoadingPeriod(true);
    try {
      const period = await projectPeriodService.getProjectPeriod(project.id);
      setProjectPeriod(period);
    } catch (error) {
      console.error('Ошибка загрузки периода проекта:', error);
    } finally {
      setLoadingPeriod(false);
    }
  };

  loadProjectPeriod();
}, [project.id]);
```

3. **Добавлено поле в интерфейс:**
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 flex items-center">
    <Calendar className="w-4 h-4 mr-1" />
    Период проведения
  </label>
  {loadingPeriod ? (
    <div className="flex items-center">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
      <span className="text-gray-500 text-sm">Загрузка...</span>
    </div>
  ) : (
    <p className="text-gray-900">
      {projectPeriod ? projectPeriodService.formatPeriod(projectPeriod) : 'Не установлен'}
    </p>
  )}
</div>
```

## Логика работы

### Для этапов с одной датой:
1. Пользователь выбирает дату в поле "Дата"
2. Эта дата автоматически устанавливается как для `startDate`, так и для `endDate`
3. При сохранении в базу данных записываются обе даты с одинаковым значением

### Для периода проведения:
1. При загрузке компонента `ProjectInfo` автоматически загружается период проведения
2. Сервис находит все объекты квалификации для проекта
3. Загружает все расписания и находит крайние даты
4. Отображает период в формате:
   - "01.01.2024 - 15.01.2024" (если есть диапазон)
   - "01.01.2024" (если одна дата)
   - "с 01.01.2024" (если только начальная дата)
   - "до 15.01.2024" (если только конечная дата)
   - "Период не установлен" (если нет дат)

## Файлы изменены:
- `src/components/QualificationWorkSchedule.tsx` - упрощение полей дат
- `src/components/contract/ProjectInfo.tsx` - добавление поля периода проведения
- `src/utils/projectPeriodService.ts` - новый сервис для работы с периодами

## Результат:
- ✅ Упрощен интерфейс для этапов с одной датой
- ✅ Добавлено поле "Период проведения" в информацию о проекте
- ✅ Автоматический расчет периода на основе всех объектов квалификации
- ✅ Индикатор загрузки для периода проведения
- ✅ Корректное форматирование дат в русском формате

## Тестирование:
1. Откройте объект квалификации
2. Установите даты для разных этапов (включая этапы с одной датой)
3. Сохраните расписание
4. Перейдите в информацию о проекте
5. Проверьте, что поле "Период проведения" показывает корректный диапазон дат























