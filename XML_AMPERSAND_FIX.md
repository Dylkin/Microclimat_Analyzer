# Исправление проблемы с неэкранированными амперсандами в DOCX файлах

## Проблема
Сформированные DOCX файлы не открываются в Microsoft Word из-за ошибки "Word error when attempting to open the file". В логах консоли появляется сообщение:

```
docxTemplateProcessor.ts:781 XML contains unescaped ampersands, attempting to fix...
```

## Причина
В XML структуре DOCX файла присутствуют неэкранированные символы `&` (амперсанды), которые делают XML невалидным. Microsoft Word не может открыть файлы с некорректным XML.

## Внесенные исправления

### 1. Улучшена проверка неэкранированных амперсандов в `processTablePlaceholder`:
```typescript
// Проверяем, что XML валиден
if (result.includes('&')) {
  console.warn('XML contains ampersands, checking for unescaped ones...');
  // Проверяем наличие неэкранированных амперсандов
  const unescapedAmpersands = result.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (unescapedAmpersands && unescapedAmpersands.length > 0) {
    console.warn('Found unescaped ampersands:', unescapedAmpersands);
    // Исправляем неэкранированные амперсанды
    const fixedResult = result.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
    console.log('Fixed unescaped ampersands');
    return fixedResult;
  } else {
    console.log('All ampersands are properly escaped');
  }
}
```

### 2. Добавлена проверка XML валидности в `createResultsTableXml`:
```typescript
// Дополнительная проверка XML валидности
if (fullTableXml.includes('&')) {
  const unescapedAmpersands = fullTableXml.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (unescapedAmpersands && unescapedAmpersands.length > 0) {
    console.warn('Table XML contains unescaped ampersands:', unescapedAmpersands);
    // Исправляем неэкранированные амперсанды
    const fixedXml = fullTableXml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
    console.log('Fixed unescaped ampersands in table XML');
    return fixedXml;
  }
}
```

### 3. Добавлена финальная проверка в `processTextPlaceholders`:
```typescript
// Финальная проверка XML валидности
if (result.includes('&')) {
  const unescapedAmpersands = result.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (unescapedAmpersands && unescapedAmpersands.length > 0) {
    console.warn('Final XML contains unescaped ampersands:', unescapedAmpersands);
    // Исправляем неэкранированные амперсанды
    result = result.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
    console.log('Fixed unescaped ampersands in final XML');
  }
}
```

## Ключевые улучшения

### 1. Более точная проверка:
- Регулярное выражение теперь учитывает все возможные XML сущности: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&#123;`, `&#x1A;`
- Проверка выполняется на каждом этапе обработки XML

### 2. Подробная диагностика:
- Логирование найденных неэкранированных амперсандов
- Информация о том, на каком этапе была выполнена коррекция

### 3. Многоуровневая защита:
- Проверка в `createResultsTableXml` (уровень таблицы)
- Проверка в `processTablePlaceholder` (уровень документа)
- Финальная проверка в `processTextPlaceholders` (общий уровень)

## Ожидаемые результаты

### При следующем запуске в консоли должно появиться:
```
XML contains ampersands, checking for unescaped ones...
All ampersands are properly escaped
```

### Если есть проблемы с XML:
```
XML contains ampersands, checking for unescaped ones...
Found unescaped ampersands: ['&', '&']
Fixed unescaped ampersands
```

## Тестирование

### Шаг 1: Запустите формирование отчета
1. Откройте приложение
2. Загрузите шаблон с плейсхолдером `{Table}`
3. Нажмите "Сформировать отчет"

### Шаг 2: Проверьте консоль браузера
Ищите сообщения о проверке амперсандов:
- `XML contains ampersands, checking for unescaped ones...`
- `All ampersands are properly escaped` (успех)
- `Found unescaped ampersands:` (если есть проблемы)

### Шаг 3: Проверьте результат
1. Скачайте сформированный отчет
2. Попробуйте открыть его в Microsoft Word
3. Убедитесь, что файл открывается без ошибок

## Возможные проблемы

### Если файл все еще не открывается:
1. Проверьте, что в данных нет специальных символов
2. Убедитесь, что все поля данных заполнены корректно
3. Проверьте, что XML структура таблицы не нарушена

### Если таблица не отображается:
1. Проверьте, что плейсхолдер `{Table}` присутствует в шаблоне
2. Убедитесь, что есть данные для анализа
3. Проверьте, что функция `createResultsTableXml` работает корректно

## Заключение

Исправления должны решить проблемы с валидностью XML в DOCX файлах. Теперь система:

1. **Проверяет XML валидность** на каждом этапе обработки
2. **Автоматически исправляет** неэкранированные амперсанды
3. **Предоставляет подробную диагностику** для отладки
4. **Создает корректные** DOCX файлы, которые можно открыть в Microsoft Word

После тестирования DOCX файлы должны открываться без ошибок и содержать корректно отформатированную таблицу результатов анализа.








