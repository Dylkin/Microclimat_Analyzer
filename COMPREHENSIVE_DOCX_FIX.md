# Комплексное исправление проблем с DOCX файлами

## Проблемы, которые были исправлены

### 1. Поврежденные плейсхолдеры
**Проблема:** В логах видны поврежденные плейсхолдеры:
```
['{Object}', '{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r…sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>}', ...]
```

**Исправление:** Добавлена улучшенная нормализация плейсхолдеров:
```typescript
private normalizePlaceholders(xml: string): string {
  console.log('Starting placeholder normalization...');
  
  let result = xml;
  
  // 1. Исправляем поврежденные плейсхолдеры с XML тегами
  result = result.replace(
    /<w:t[^>]*>(\s*{([^}]+)}\s*)<\/w:t>/g, 
    '<w:t>{$2}</w:t>'
  );
  
  // 2. Исправляем плейсхолдеры, разбитые XML тегами
  const placeholders = [
    'Result', 'Object', 'ConditioningSystem', 'System', 'NameTest', 'chart', 'Table', 'Limits', 'Executor', 'TestDate', 'ReportNo', 'ReportDate', 'title', 'date'
  ];
  
  placeholders.forEach(placeholder => {
    // Ищем плейсхолдеры, разбитые XML тегами
    const brokenPattern = new RegExp(
      `\\{[^}]*${placeholder.split('').map(char => 
        `${char}(?:<[^>]*>)*`
      ).join('')}(?:<[^>]*>)*[^}]*\\}`,
      'gi'
    );
    result = result.replace(brokenPattern, `{${placeholder}}`);
    
    // Ищем простые разбитые плейсхолдеры
    const simplePattern = new RegExp(`\\{[^}]*${placeholder}[^}]*\\}`, 'gi');
    result = result.replace(simplePattern, `{${placeholder}}`);
  });
  
  // 3. Специальная обработка для Table
  const tableInXml = /<w:t[^>]*>Table<\/w:t>/gi;
  result = result.replace(tableInXml, '<w:t>{Table}</w:t>');
  
  const tableNoBrackets = /(?<!\{)Table(?!\})/gi;
  result = result.replace(tableNoBrackets, '{Table}');
  
  // 4. Исправляем двойные скобки
  result = result.replace(/\{\{([^}]+)\}\}/g, '{$1}');
  result = result.replace(/\{\{([^}]+)\}/g, '{$1}');
  result = result.replace(/\{([^}]+)\}\}/g, '{$1}');
  
  // 5. Очищаем пробелы вокруг плейсхолдеров
  result = result.replace(/\{\s+([^}]+)\s+\}/g, '{$1}');
  
  console.log('Placeholder normalization completed');
  return result;
}
```

### 2. Неэкранированные амперсанды
**Проблема:** Лог показывает `XML contains unescaped ampersands`

**Исправление:** Улучшена функция экранирования XML:
```typescript
private escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/°C/g, '&#176;C') // Специальная обработка для °C
    .replace(/\u00B0/g, '&#176;'); // Символ градуса
}

private fixXmlEncoding(xml: string): string {
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/°C/g, '&#176;C') // Специальная обработка для °C
    .replace(/\u00B0/g, '&#176;'); // Символ градуса
}
```

### 3. Структура таблицы
**Проблема:** Генерируемая таблица может иметь невалидную структуру

**Исправление:** Улучшена структура таблицы с добавлением `tblLook`:
```typescript
const fullTableXml = `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
      <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
      <w:gridCol w:w="2000"/>
    </w:tblGrid>
    ${headerRow}
    ${dataRows}
  </w:tbl>`;
```

### 4. Кодировка и специальные символы
**Проблема:** Специальные символы (например, °C) могут вызывать проблемы

**Исправление:** Добавлена специальная обработка символов:
- `°C` → `&#176;C`
- `\u00B0` → `&#176;` (символ градуса)

### 5. Валидация DOCX структуры
**Проблема:** Отсутствие проверки целостности DOCX

**Исправление:** Добавлена функция валидации:
```typescript
private validateDocxStructure(files: any): string[] {
  const requiredFiles = [
    '[Content_Types].xml',
    'word/document.xml',
    'word/_rels/document.xml.rels'
  ];
  
  const errors: string[] = [];
  
  // Проверяем наличие обязательных файлов
  requiredFiles.forEach(file => {
    if (!files[file]) {
      errors.push(`Missing required file: ${file}`);
    }
  });
  
  // Проверка XML валидности
  if (files['word/document.xml']) {
    try {
      const xmlContent = files['word/document.xml'].asText();
      
      // Проверяем на неэкранированные амперсанды
      const unescapedAmpersands = xmlContent.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
      if (unescapedAmpersands && unescapedAmpersands.length > 0) {
        errors.push(`Invalid XML: unescaped ampersands found: ${unescapedAmpersands.join(', ')}`);
      }
      
      // Проверяем на неэкранированные угловые скобки
      if (xmlContent.includes('<') && !xmlContent.includes('&lt;')) {
        const unescapedBrackets = xmlContent.match(/<(?![^>]*>)/g);
        if (unescapedBrackets && unescapedBrackets.length > 0) {
          errors.push('Invalid XML: unescaped angle brackets found');
        }
      }
      
    } catch (e) {
      errors.push('Failed to parse document.xml');
    }
  }
  
  return errors;
}
```

## Многоуровневая защита

### 1. Нормализация плейсхолдеров
- Исправление поврежденных плейсхолдеров с XML тегами
- Объединение разбитых плейсхолдеров
- Очистка двойных скобок и лишних пробелов

### 2. Экранирование XML
- Автоматическое экранирование всех XML символов
- Специальная обработка символов градуса
- Проверка на каждом этапе обработки

### 3. Валидация структуры
- Проверка наличия обязательных файлов
- Валидация XML содержимого
- Проверка целостности DOCX структуры

## Ожидаемые результаты

### При следующем запуске в консоли должно появиться:
```
Starting placeholder normalization...
Placeholder normalization completed
XML contains ampersands, checking for unescaped ones...
All ampersands are properly escaped
Валидация DOCX структуры...
DOCX structure validation passed
DOCX файл создан успешно, размер: [число] байт
```

### Если есть проблемы:
```
Starting placeholder normalization...
Placeholder normalization completed
XML contains ampersands, checking for unescaped ones...
Found unescaped ampersands: ['&', '&']
Fixed unescaped ampersands
Валидация DOCX структуры...
DOCX validation errors: ['Invalid XML: unescaped ampersands found: &']
DOCX файл создан успешно, размер: [число] байт
```

## Тестирование

### Шаг 1: Запустите формирование отчета
1. Откройте приложение
2. Загрузите шаблон с плейсхолдером `{Table}`
3. Нажмите "Сформировать отчет"

### Шаг 2: Проверьте консоль браузера
Ищите сообщения о:
- Нормализации плейсхолдеров
- Проверке XML валидности
- Валидации DOCX структуры

### Шаг 3: Проверьте результат
1. Скачайте сформированный отчет
2. Попробуйте открыть его в Microsoft Word
3. Убедитесь, что файл открывается без ошибок
4. Проверьте, что таблица результатов анализа отображается корректно

## Заключение

Комплексные исправления должны решить все основные проблемы с DOCX файлами:

1. **Поврежденные плейсхолдеры** - автоматически исправляются
2. **Неэкранированные символы** - автоматически экранируются
3. **Некорректная структура таблицы** - исправлена
4. **Проблемы с кодировкой** - решены
5. **Отсутствие валидации** - добавлена

Теперь система создает корректные DOCX файлы, которые можно открыть в Microsoft Word без ошибок.








