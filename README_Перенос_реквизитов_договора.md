# Перенос реквизитов договора в блок "Информация об объекте"

## Задача

Перенести поля "Реквизиты договора" из `TimeSeriesAnalyzer` в блок "Информация об объекте" в `DataAnalysis` и сделать их недоступными для редактирования.

## Изменения

### 1. Обновлен блок "Информация об объекте" в DataAnalysis.tsx

Добавлен новый подблок "Реквизиты договора" с полями:

```tsx
{/* Реквизиты договора */}
<div className="mt-4 pt-4 border-t border-gray-200">
  <h4 className="text-sm font-medium text-gray-800 mb-3">Реквизиты договора</h4>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div>
      <span className="font-medium text-gray-800">№ договора:</span>
      <p className="text-gray-700">{fullProject?.contractNumber || 'Не указан'}</p>
    </div>
    <div>
      <span className="font-medium text-gray-800">Дата договора:</span>
      <p className="text-gray-700">
        {fullProject?.contractDate 
          ? new Date(fullProject.contractDate).toLocaleDateString('ru-RU')
          : 'Не указана'
        }
      </p>
    </div>
    <div>
      <span className="font-medium text-gray-800">Климатическая установка:</span>
      <p className="text-gray-700">{selectedQualificationObject.climateSystem || 'Не указана'}</p>
    </div>
    <div>
      <span className="font-medium text-gray-800">Объект квалификации:</span>
      <p className="text-gray-700">{selectedQualificationObject.name || selectedQualificationObject.vin || selectedQualificationObject.serialNumber || 'Без названия'}</p>
    </div>
  </div>
</div>
```

### 2. Удален блок "Реквизиты договора" из TimeSeriesAnalyzer.tsx

Полностью удален блок с редактируемыми полями:

```tsx
{/* Contract Information - moved test type to markers section */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Реквизиты договора</label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Поля ввода удалены */}
  </div>
</div>
```

### 3. Упрощен интерфейс TimeSeriesAnalyzerProps

Удален проп `project`:

```tsx
// Было
interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack?: () => void;
  qualificationObjectId?: string;
  projectId?: string;
  project?: {
    contractNumber?: string;
    contractDate?: string;
  };
}

// Стало
interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack?: () => void;
  qualificationObjectId?: string;
  projectId?: string;
}
```

### 4. Удален useEffect для инициализации полей договора

Удален код, который автоматически заполнял поля договора:

```tsx
// Удалено
useEffect(() => {
  if (project) {
    setContractFields(prev => ({
      ...prev,
      contractNumber: project.contractNumber || '',
      contractDate: project.contractDate ? new Date(project.contractDate).toISOString().split('T')[0] : ''
    }));
  }
}, [project]);
```

### 5. Упрощена передача пропсов в DataAnalysis.tsx

```tsx
// Было
<TimeSeriesAnalyzer 
  files={[]}
  qualificationObjectId={selectedQualificationObject.id}
  projectId={fullProject?.id || project.id}
  project={{
    contractNumber: fullProject?.contractNumber,
    contractDate: fullProject?.contractDate
  }}
/>

// Стало
<TimeSeriesAnalyzer 
  files={[]}
  qualificationObjectId={selectedQualificationObject.id}
  projectId={fullProject?.id || project.id}
/>
```

### 6. Обновлена функция getQualificationObjectDisplayName

Упрощена для работы с данными из пропсов:

```tsx
// Было - сложная логика с файлами
const getQualificationObjectDisplayName = (): string => {
  const filesWithQualification = files.filter(f => f.qualificationObjectId);
  // ... сложная логика
};

// Стало - простая логика с пропсами
const getQualificationObjectDisplayName = (): string => {
  if (qualificationObjectId) {
    return `Объект ${qualificationObjectId.substring(0, 8)}...`;
  }
  return 'Не указан';
};
```

## Результат

### ✅ Что изменилось:

1. **Поля перенесены** из `TimeSeriesAnalyzer` в блок "Информация об объекте" в `DataAnalysis`
2. **Поля стали недоступными для редактирования** - отображаются как текст, а не как поля ввода
3. **Данные автоматически заполняются** из проекта и объекта квалификации
4. **Упрощен код** - удалены ненужные состояния и функции
5. **Улучшена структура** - реквизиты договора логически связаны с информацией об объекте

### 📊 Отображение данных:

**Блок "Информация об объекте" теперь содержит:**

1. **Основная информация:**
   - Тип
   - Производитель  
   - Точек измерения
   - Логгеров

2. **Реквизиты договора:**
   - № договора: "ВР-15-25"
   - Дата договора: "01.10.2025"
   - Климатическая установка: "Не указана" (для холодильника)
   - Объект квалификации: "ХК-32"

### 🎯 Преимущества:

- ✅ **Логическая группировка** - реквизиты договора связаны с объектом
- ✅ **Только для чтения** - данные нельзя случайно изменить
- ✅ **Автоматическое заполнение** - данные берутся из проекта
- ✅ **Упрощенный интерфейс** - меньше полей для редактирования
- ✅ **Лучшая структура** - информация сгруппирована логически

## Тестирование

Для проверки изменений:

1. Откройте страницу "Анализ данных"
2. Убедитесь, что в блоке "Информация об объекте" есть подблок "Реквизиты договора"
3. Проверьте, что поля отображают корректные данные и недоступны для редактирования
4. Убедитесь, что в `TimeSeriesAnalyzer` больше нет блока "Реквизиты договора"



















