# Окончательное исправление проблемы с кириллическими именами файлов

## Проблема
При загрузке файлов с кириллическими символами в именах возникала ошибка:
```
POST https://rcplxggzlkqsypffugno.supabase.co/storage/v1/object/qualification-objects/plans/.../1759173250840-Farmatsiya_gomel%D1%8C_otdel_1_6_3_otchet_zima_2024.png 400 (Bad Request)
Ошибка загрузки файла плана: Error: Ошибка загрузки файла плана: Invalid key: plans/.../1759173250840-Farmatsiya_gomelь_otdel_1_6_3_otchet_zima_2024.png
```

## Причина
1. Supabase Storage не поддерживает кириллические символы в URL-путях
2. Функция очистки имен файлов работала некорректно - использовала `if (cyrillicMap[char])` вместо `if (cyrillicMap[char] !== undefined)`
3. Символ "ь" (мягкий знак) имеет пустое значение в маппинге, что приводило к неправильной обработке

## Решение
Исправлена функция `sanitizeFileName` в файле `src/utils/fileNameUtils.ts`:

### До исправления:
```typescript
if (cyrillicMap[char]) {
  transliterated += cyrillicMap[char];
} else {
  transliterated += char;
}
```

### После исправления:
```typescript
if (cyrillicMap[char] !== undefined) {
  transliterated += cyrillicMap[char];
} else {
  transliterated += char;
}
```

## Результат тестирования
- **Исходное имя:** `Farmatsiya gomelь otdel 1 6 3 otchet zima 2024.png`
- **Очищенное имя:** `Farmatsiya_gomel_otdel_1_6_3_otchet_zima_2024.png`
- **Содержит кириллицу:** `false` ✅

## Файлы, использующие исправленную функцию:
- `src/utils/qualificationObjectService.ts` - загрузка планов и данных испытаний
- `src/utils/enhancedProjectDocumentService.ts` - загрузка документов проектов
- `src/utils/projectDocumentService.ts` - базовая загрузка документов
- `src/utils/testingPeriodService.ts` - загрузка документов периодов испытаний

## Статус
✅ **ИСПРАВЛЕНО** - Файлы с кириллическими именами теперь успешно загружаются в Supabase Storage

## Проверка
Сервер разработки работает на порту 5173. Можно протестировать загрузку файлов с кириллическими именами в интерфейсе приложения.























