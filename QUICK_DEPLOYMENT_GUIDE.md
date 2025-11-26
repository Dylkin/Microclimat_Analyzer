# Быстрая инструкция по созданию архива для развертывания

## Создание архива

### Для Linux/Mac:

```bash
./create-deployment-archive.sh
```

### Для Windows:

```batch
create-deployment-archive.bat
```

Архив будет создан в текущей директории с именем вида:
- `microclimat-analyzer-deployment-YYYYMMDD-HHMM.zip` (Windows)
- `microclimat-analyzer-deployment-YYYYMMDD-HHMMSS.tar.gz` (Linux)

## Что включено в архив

✅ Исходный код frontend (`src/`)  
✅ Исходный код backend (`server/`)  
✅ Миграции базы данных (`supabase/migrations/`)  
✅ Файлы конфигурации (`package.json`, `tsconfig.json`, `vite.config.ts`, и т.д.)  
✅ Инструкция по развертыванию (`DEPLOYMENT_INSTRUCTIONS.md`)  
✅ Пример файла конфигурации (`.env.example`)  

## Что НЕ включено в архив

❌ `node_modules/` - устанавливаются на сервере  
❌ `dist/` - собирается на сервере  
❌ `.env` - создается на сервере на основе `.env.example`  
❌ `uploads/` - создается на сервере  
❌ Временные файлы и логи  

## Следующие шаги

1. Передайте архив на сервер
2. Распакуйте архив
3. Следуйте подробным инструкциям в `DEPLOYMENT_INSTRUCTIONS.md`




