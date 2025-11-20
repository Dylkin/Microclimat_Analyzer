# Обновление диагностики проблемы с плейсхолдером {Table}

## Проблема
Плейсхолдер `{Table}` исчезает в процессе обработки шаблона, хотя он присутствует в исходном файле.

## Анализ логов
Из предыдущих логов видно:
- ✅ **При анализе шаблона**: `Found resultsTable placeholder in template` - плейсхолдер найден
- ❌ **При обработке документа**: `{Table} exists before chart replacement: false` - плейсхолдер уже отсутствует

## Внесенные улучшения диагностики

### 1. Улучшенная диагностика в `analyzeTemplateContent()`:
```typescript
// Проверим наличие resultsTable в различных формах
const hasResultsTableExact = documentXml.includes('{Table}');
const hasResultsTableNoBrackets = documentXml.includes('resultsTable');
const hasResultsAndTable = documentXml.includes('results') && documentXml.includes('Table');

// Дополнительная диагностика: найдем фрагменты с "results" или "Table"
const resultsMatches = documentXml.match(/[^<]*results[^<]*/gi) || [];
const tableMatches = documentXml.match(/[^<]*Table[^<]*/gi) || [];
```

### 2. Диагностика в `createNewReport()`:
```typescript
// Диагностика: проверяем содержимое документа сразу после загрузки
console.log('Document loaded, XML length:', documentXml.length);
const hasResultsTableOnLoad = documentXml.includes('{Table}');
console.log('{Table} exists on document load:', hasResultsTableOnLoad);

// Найдем все плейсхолдеры в загруженном документе
const placeholderRegex = /\{[^}]+\}/g;
const initialPlaceholders = documentXml.match(placeholderRegex) || [];
console.log('Initial placeholders in loaded document:', initialPlaceholders);
```

### 3. Существующая диагностика в `replaceChartPlaceholder()` и `normalizePlaceholders()`:
- Проверка наличия `{Table}` на каждом этапе обработки
- Детальная информация о состоянии плейсхолдеров

## Ожидаемые результаты диагностики

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

## Возможные сценарии

### Сценарий 1: Плейсхолдер есть в анализе, но отсутствует при загрузке
```
Template analysis: hasResultsTable: true
Document loaded: {Table} exists on document load: false
```
**Причина**: Проблема в функции `analyzeTemplateContent()` - она анализирует другой файл или версию.

### Сценарий 2: Плейсхолдер есть при загрузке, но исчезает при нормализации
```
Document loaded: {Table} exists on document load: true
Normalization: {Table} exists after: false
```
**Причина**: Проблема в функции `normalizePlaceholders()` - регулярные выражения неправильно обрабатывают плейсхолдер.

### Сценарий 3: Плейсхолдер есть после нормализации, но исчезает при замене chart
```
Normalization: {Table} exists after: true
{Table} exists after chart replacement: false
```
**Причина**: Проблема в функции `replaceChartPlaceholder()` - она случайно удаляет другие плейсхолдеры.

## Следующие шаги

1. **Запустите формирование отчета** снова
2. **Проверьте консоль браузера** на наличие новой диагностики
3. **Определите точный этап**, где исчезает `{Table}`
4. **Внесите исправления** на основе результатов диагностики

## Заключение

Новая диагностика поможет точно определить, на каком этапе исчезает плейсхолдер `{Table}` и почему это происходит. Это позволит быстро найти и исправить проблему.

После получения результатов диагностики можно будет внести точные исправления в код.
