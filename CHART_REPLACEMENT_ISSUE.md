# Проблема с исчезновением плейсхолдера {Table} при замене {chart}

## Проблема
Плейсхолдер `{Table}` исчезает при обработке шаблона, хотя он присутствует в исходном файле.

## Диагностика из логов

### 1. Анализ шаблона (успешно):
```
Template analysis: {placeholders: Array(16), hasResultsTable: true, content: '...'}
Found resultsTable placeholder in template
```

### 2. Обработка документа (проблема):
```
Initial placeholders in document: ['{Object}', '{System}', '{NameTest}', ...]
Placeholders after normalization: ['{Object}', '{System}', '{NameTest}', ...]
Processing {Table} placeholder...
Document contains {Table}: false
```

## Причина проблемы

Плейсхолдер `{Table}` исчезает в процессе обработки, скорее всего при замене плейсхолдера `{chart}` на XML изображения.

## Внесенные улучшения диагностики

### 1. Диагностика в `replaceChartPlaceholder()`:
- Проверка наличия `{Table}` до нормализации
- Проверка наличия `{Table}` после нормализации  
- Проверка наличия `{Table}` после замены chart

### 2. Диагностика в `normalizePlaceholders()`:
- Проверка наличия `{Table}` до нормализации
- Проверка наличия `{Table}` после обработки каждого плейсхолдера
- Проверка наличия `{Table}` после нормализации

### 3. Диагностика в основном процессе:
- Проверка наличия `{Table}` после замены chart
- Детальная информация о состоянии плейсхолдеров

## Ожидаемая диагностика

### При следующем запуске в консоли должно появиться:

```
Template analysis: {placeholders: [...], hasResultsTable: true, content: "..."}
Found resultsTable placeholder in template

Analyzing template content...
Document XML length: [число]
Found placeholders in template: ['{Object}', '{Table}', ...]
{Table} exact match: true
resultsTable without brackets: true
results + Table separate: false
Fragments containing "results": [...]
Fragments containing "Table": [...]

Document loaded, XML length: [число]
{Table} exists on document load: true
Initial placeholders in loaded document: ['{Object}', '{Table}', ...]

{Table} exists before chart replacement: true
Normalization: {Table} exists before: true
Normalization: {Table} exists after processing resultsTable: true
Normalization: {Table} exists after: true
{Table} exists after normalization: true
{Table} exists after chart replacement: true
Плейсхолдер {chart} заменен на XML изображения
{Table} placeholder exists after chart replacement: true

Initial placeholders in document: ['{Object}', '{Table}', ...]
Placeholders after normalization: ['{Object}', '{Table}', ...]
Processing {Table} placeholder...
Document contains {Table}: true
Creating results table XML...
{Table} placeholder replaced successfully
```

## Возможные причины исчезновения

### 1. Проблема в нормализации:
- Регулярные выражения в `normalizePlaceholders()` могут неправильно обрабатывать `{Table}`
- XML теги внутри плейсхолдера могут нарушать обработку

### 2. Проблема в замене chart:
- Функция `replaceChartPlaceholder()` может случайно удалять другие плейсхолдеры
- XML структура изображения может конфликтовать с плейсхолдерами

### 3. Проблема в структуре DOCX:
- Плейсхолдер может быть в сложной XML структуре, которая нарушается при обработке
- Разбитые плейсхолдеры могут не восстанавливаться правильно

## План решения

### Шаг 1: Запустить диагностику
Запустите формирование отчета и проверьте консоль браузера.

### Шаг 2: Анализ результатов
Найдите, на каком этапе исчезает `{Table}`:
- До нормализации: `{Table} exists before chart replacement: true/false`
- После нормализации: `{Table} exists after normalization: true/false`
- После замены chart: `{Table} exists after chart replacement: true/false`

### Шаг 3: Исправление
В зависимости от результатов:

#### Если исчезает при нормализации:
- Проверить регулярные выражения в `normalizePlaceholders()`
- Добавить специальную обработку для `{Table}`

#### Если исчезает при замене chart:
- Проверить функцию `replaceChartPlaceholder()`
- Убедиться, что она не затрагивает другие плейсхолдеры

#### Если исчезает в другом месте:
- Добавить дополнительную диагностику
- Проверить все этапы обработки

## Временное решение

Если проблема критична, можно:

1. **Обрабатывать плейсхолдеры в другом порядке** - сначала `{Table}`, потом `{chart}`
2. **Создать резервную копию** плейсхолдеров перед обработкой
3. **Использовать более безопасную замену** с проверкой сохранности других плейсхолдеров

## Заключение

Новая диагностика поможет точно определить, на каком этапе исчезает плейсхолдер `{Table}` и почему это происходит. Это позволит быстро найти и исправить проблему.

После получения результатов диагностики можно будет внести точные исправления в код.
