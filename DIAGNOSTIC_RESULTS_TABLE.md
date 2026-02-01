# Диагностика проблемы с плейсхолдером {Table}

## Проблема
При обработке загруженного шаблона не читается плейсхолдер `{Table}`, хотя он присутствует в шаблоне.

## Внесенные улучшения

### 1. Расширенная диагностика плейсхолдеров

#### В `docxTemplateProcessor.ts`:
- **Детекция разбитых плейсхолдеров**: поиск вариантов `{results}`, `{Table}`, `resultsTable`
- **Анализ фрагментов документа**: показ частей документа, содержащих "results" или "Table"
- **Улучшенная нормализация**: специальная обработка для `resultsTable`

#### В `TimeSeriesAnalyzer.tsx`:
- **Анализ содержимого шаблона**: детальный анализ DOCX файла
- **Проверка вариантов**: поиск различных форм плейсхолдера
- **Предварительный просмотр**: показ содержимого шаблона

### 2. Новая функция анализа шаблона

```typescript
async analyzeTemplateContent(templateFile: File): Promise<{
  placeholders: string[];
  hasResultsTable: boolean;
  content: string;
}>
```

Эта функция:
- Извлекает XML содержимое DOCX файла
- Находит все плейсхолдеры в документе
- Проверяет наличие `{Table}` в различных формах
- Возвращает первые 1000 символов для анализа

### 3. Улучшенная обработка разбитых плейсхолдеров

#### Нормализация теперь обрабатывает:
- `{Table}` - стандартная форма
- `resultsTable` - без фигурных скобок
- `results` + `Table` - разбитые на части
- Варианты с XML тегами внутри

## Как использовать диагностику

### 1. Загрузите шаблон
Загрузите ваш DOCX шаблон в приложение.

### 2. Проверьте консоль браузера
После загрузки в консоли должно появиться:

```
Template analysis: {
  placeholders: ["{Object}", "{NameTest}", "{Table}", ...],
  hasResultsTable: true,
  content: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>..."
}
```

### 3. Анализ результатов

#### Если `hasResultsTable: true`:
- Плейсхолдер найден и будет обработан
- Таблица результатов будет вставлена

#### Если `hasResultsTable: false`:
- Плейсхолдер не найден
- Проверьте массив `placeholders` - какие плейсхолдеры найдены
- Проверьте `content` - как выглядит XML содержимое

### 4. Дополнительная диагностика при формировании отчета

При формировании отчета в консоли появится:

```
Initial placeholders in document: ["{Object}", "{NameTest}", ...]
Placeholders after normalization: ["{Object}", "{NameTest}", "{Table}", ...]
Processing {Table} placeholder...
Document contains {Table}: true
Found placeholders in document: ["{Object}", "{NameTest}", "{Table}", ...]
Creating results table XML...
Generated table XML length: XXXX
{Table} placeholder replaced successfully
```

## Возможные причины проблемы

### 1. Плейсхолдер разбит на части
**Симптомы**: В `placeholders` есть `{results}` и `{Table}` отдельно
**Решение**: Нормализация должна объединить их в `{Table}`

### 2. Плейсхолдер без фигурных скобок
**Симптомы**: В `content` есть `resultsTable` без `{}`
**Решение**: Нормализация должна добавить фигурные скобки

### 3. XML теги внутри плейсхолдера
**Симптомы**: В `content` плейсхолдер разбит XML тегами
**Решение**: Нормализация должна удалить XML теги

### 4. Плейсхолдер в колонтитулах
**Симптомы**: Плейсхолдер есть в `content`, но не в основном документе
**Решение**: Проверьте, что плейсхолдер в основном тексте, а не только в колонтитулах

## Пошаговая диагностика

### Шаг 1: Проверьте загрузку шаблона
```
Template analysis: { placeholders: [...], hasResultsTable: true/false, content: "..." }
```

### Шаг 2: Проверьте нормализацию
```
Initial placeholders in document: [...]
Placeholders after normalization: [...]
```

### Шаг 3: Проверьте обработку
```
Processing {Table} placeholder...
Document contains {Table}: true/false
```

### Шаг 4: Если проблема остается
1. Проверьте `content` - как выглядит XML
2. Найдите фрагменты с "results" или "Table"
3. Убедитесь, что плейсхолдер в правильном месте

## Примеры диагностики

### Успешный случай:
```
Template analysis: {
  placeholders: ["{Object}", "{NameTest}", "{Table}", "{Result}"],
  hasResultsTable: true,
  content: "...{Table}..."
}
Processing {Table} placeholder...
Document contains {Table}: true
{Table} placeholder replaced successfully
```

### Проблемный случай:
```
Template analysis: {
  placeholders: ["{Object}", "{NameTest}", "{Result}"],
  hasResultsTable: false,
  content: "...resultsTable..."
}
Processing {Table} placeholder...
Document contains {Table}: false
Found potential resultsTable variant: resultsTable
```

## Заключение

Новая диагностика поможет точно определить, почему плейсхолдер `{Table}` не обрабатывается:

1. **Анализ шаблона** покажет, какие плейсхолдеры найдены
2. **Нормализация** исправит разбитые плейсхолдеры
3. **Детальная диагностика** покажет процесс обработки
4. **Фрагменты документа** помогут найти проблемные места

Используйте эту диагностику для точного определения причины проблемы и её решения.
