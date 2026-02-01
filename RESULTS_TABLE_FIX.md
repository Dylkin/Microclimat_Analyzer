# Исправление проблемы с плейсхолдером {Table}

## Проблема
Плейсхолдер `{Table}` в шаблоне находится в разбитом виде (без фигурных скобок), но функция нормализации не может его правильно восстановить.

## Анализ логов
Из логов видно:
- ✅ **При анализе шаблона**: `resultsTable without brackets: true` и `results + Table separate: true` - плейсхолдер найден в разбитом виде
- ❌ **При загрузке документа**: `{Table} exists on document load: false` - плейсхолдер исчезает

## Внесенные исправления

### 1. Специальная предварительная обработка для resultsTable:
```typescript
// Специальная предварительная обработка для resultsTable
if (!hasResultsTableBefore) {
  console.log('Pre-processing resultsTable placeholder...');
  
  // Ищем случаи, где resultsTable может быть в XML тегах без фигурных скобок
  const resultsTableInXml = /<w:t[^>]*>resultsTable<\/w:t>/gi;
  result = result.replace(resultsTableInXml, '<w:t>{Table}</w:t>');
  
  // Ищем случаи, где resultsTable может быть разбит на части в XML
  const resultsTableSplitInXml = /<w:t[^>]*>results<\/w:t>(?:<[^>]*>)*<w:t[^>]*>Table<\/w:t>/gi;
  result = result.replace(resultsTableSplitInXml, '<w:t>{Table}</w:t>');
  
  // Ищем случаи, где resultsTable может быть просто "resultsTable" без фигурных скобок
  const resultsTableNoBrackets = /resultsTable/gi;
  result = result.replace(resultsTableNoBrackets, '{Table}');
}
```

### 2. Улучшенная обработка в основном цикле:
```typescript
// Специальная обработка для resultsTable - ищем разбитые варианты
if (placeholder === 'resultsTable') {
  // Ищем случаи, где resultsTable может быть разбит на части
  const resultsTableRegex = /results(?:<[^>]*>)*Table/gi;
  result = result.replace(resultsTableRegex, '{Table}');
  
  // Ищем случаи, где может быть просто "resultsTable" без фигурных скобок
  const resultsTableNoBrackets = /resultsTable/gi;
  result = result.replace(resultsTableNoBrackets, '{Table}');
  
  // Ищем случаи, где resultsTable может быть в XML тегах
  const resultsTableInXml = /<w:t[^>]*>resultsTable<\/w:t>/gi;
  result = result.replace(resultsTableInXml, '<w:t>{Table}</w:t>');
  
  // Ищем случаи, где resultsTable может быть разбит на части в XML
  const resultsTableSplitInXml = /<w:t[^>]*>results<\/w:t>(?:<[^>]*>)*<w:t[^>]*>Table<\/w:t>/gi;
  result = result.replace(resultsTableSplitInXml, '<w:t>{Table}</w:t>');
}
```

## Ожидаемые результаты

### При следующем запуске в консоли должно появиться:

```
Template analysis: {placeholders: [...], hasResultsTable: true, content: "..."}
Found resultsTable placeholder in template

Analyzing template content...
Document XML length: [число]
Found placeholders in template: ['{Object}', 'resultsTable', ...]
{Table} exact match: false
resultsTable without brackets: true
results + Table separate: true
Fragments containing "results": ['w:t>resultsTable']
Fragments containing "Table": ['w:t>resultsTable']

Document loaded, XML length: [число]
{Table} exists on document load: false
Initial placeholders in loaded document: ['{Object}', 'resultsTable', ...]

{Table} exists before chart replacement: false
Normalization: {Table} exists before: false
Pre-processing resultsTable placeholder...
Pre-processing: {Table} exists after: true
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

## Ключевые изменения

### 1. Предварительная обработка:
- Обрабатывается **ДО** основного цикла нормализации
- Специально ищет разбитые варианты `resultsTable`
- Восстанавливает плейсхолдер в правильном формате `{Table}`

### 2. Улучшенная обработка в основном цикле:
- Дополнительные регулярные выражения для поиска разбитых вариантов
- Обработка XML тегов, содержащих `resultsTable`
- Обработка случаев, где `results` и `Table` находятся в разных XML тегах

### 3. Диагностика:
- Подробные логи на каждом этапе обработки
- Проверка наличия плейсхолдера до и после каждого этапа
- Информация о найденных фрагментах

## Тестирование

### Шаг 1: Запустите формирование отчета
1. Откройте приложение
2. Загрузите шаблон с плейсхолдером `{Table}`
3. Нажмите "Сформировать отчет"

### Шаг 2: Проверьте консоль браузера
Ищите следующие сообщения:
- `Pre-processing resultsTable placeholder...`
- `Pre-processing: {Table} exists after: true`
- `Document contains {Table}: true`
- `Creating results table XML...`
- `{Table} placeholder replaced successfully`

### Шаг 3: Проверьте результат
В сформированном отчете должна быть вставлена таблица "Результаты анализа" вместо текста из поля "Выводы".

## Возможные проблемы

### Если плейсхолдер все еще не найден:
1. Проверьте, что в шаблоне действительно есть `resultsTable` (без фигурных скобок)
2. Убедитесь, что плейсхолдер не находится в сложной XML структуре
3. Проверьте, что плейсхолдер не находится в колонтитулах

### Если таблица не вставляется:
1. Проверьте, что есть данные для анализа (`analysisResults count: 3`)
2. Убедитесь, что тип данных определен (`dataType: temperature`)
3. Проверьте, что функция `createResultsTableXml` работает корректно

## Заключение

Исправления должны решить проблему с исчезновением плейсхолдера `{Table}`. Теперь система:

1. **Находит** разбитые варианты плейсхолдера в шаблоне
2. **Восстанавливает** плейсхолдер в правильном формате
3. **Обрабатывает** плейсхолдер и вставляет таблицу результатов
4. **Предоставляет** подробную диагностику на каждом этапе

После тестирования плейсхолдер `{Table}` должен корректно заменяться на таблицу "Результаты анализа".
