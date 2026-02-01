# 📊 Статус миграции с Supabase на PostgreSQL

## ✅ Выполнено

### 1. Создан API клиент
- **Файл**: `src/utils/apiClient.ts`
- **Функционал**: 
  - Единый клиент для работы с бэкенд-API
  - Поддержка GET, POST, PUT, PATCH, DELETE
  - Загрузка и скачивание файлов
  - Управление токенами аутентификации

### 2. Создан скрипт для применения миграций
- **Файл**: `server/scripts/apply-migrations.ts`
- **Функционал**:
  - Автоматическое применение `database_setup.sql`
  - Применение миграций из `supabase/migrations/`
  - Отслеживание примененных миграций через таблицу `schema_migrations`
  - Защита от повторного применения

### 3. Обновлены инструкции по развертыванию
- **Файлы**: 
  - `DEPLOYMENT_SERVER_INSTRUCTIONS.md` - обновлены для PostgreSQL
  - `MIGRATIONS_README.md` - создано руководство по миграциям
- **Изменения**:
  - Убраны упоминания Supabase
  - Добавлены инструкции по настройке PostgreSQL
  - Добавлены инструкции по настройке бэкенд-сервера

### 4. Добавлен npm-скрипт для миграций
- **Команда**: `npm run migrate`
- Применяет все миграции автоматически

## ⚠️ Требует доработки

### 1. Замена Supabase в сервисах
Многие сервисы все еще используют Supabase напрямую. Нужно заменить на API вызовы:

**Файлы, требующие обновления (12 файлов):**

**Сервисы данных:**
- `src/utils/qualificationObjectService.ts` - ✅ полностью мигрирован
- `src/utils/testingPeriodService.ts` - ✅ полностью мигрирован
- `src/utils/projectPeriodService.ts` - ✅ полностью мигрирован
- `src/utils/loggerDataService.ts` - ✅ полностью мигрирован
- `src/utils/reportService.ts` - ✅ полностью мигрирован
- `src/utils/auditService.ts` - ✅ полностью мигрирован
- `src/utils/projectDocumentService.ts` - ✅ полностью мигрирован
- `src/utils/enhancedProjectDocumentService.ts` - ✅ полностью мигрирован
- `src/utils/uploadedFileService.ts` - ✅ полностью мигрирован
- `src/utils/documentApprovalService.ts` - ✅ полностью мигрирован
- `src/utils/qualificationProtocolService.ts` - ✅ полностью мигрирован
- `src/utils/qualificationWorkScheduleService.ts` - ✅ полностью мигрирован
- `src/utils/documentationCheckService.ts` - ✅ полностью мигрирован

**Базовый файл:**
- `src/utils/supabaseClient.ts` - ✅ удален (больше не используется)

### 2. Замена Supabase в компонентах
Компоненты, использующие Supabase напрямую:

**Диагностические/утилитарные компоненты:**
- `src/components/SupabaseConnectionTest.tsx` - ✅ удален
- `src/components/SupabaseAuthInit.tsx` - ✅ удален
- `src/components/RLSManager.tsx` - ✅ удален
- `src/components/StorageRLSManager.tsx` - ✅ удален
- `src/components/StorageDiagnostic.tsx` - ✅ удален
- `src/components/StorageAuthFix.tsx` - ✅ удален
- `src/components/BucketDiagnostic.tsx` - ✅ удален
- `src/components/DatabaseTest.tsx` - ✅ удален
- `src/components/SecureAuthManager.tsx` - ✅ удален

**Основные компоненты:**
- `src/components/contract/DocumentApprovalActions.tsx` - ✅ мигрирован на API
- `src/components/SecureAuthManager.tsx` - ❌ использует Supabase
- `src/components/StorageDiagnostic.tsx` - ❌ использует Supabase Storage
- `src/components/StorageRLSManager.tsx` - ❌ использует Supabase Storage
- `src/components/RLSManager.tsx` - ❌ использует Supabase
- `src/components/BucketDiagnostic.tsx` - ❌ использует Supabase Storage
- `src/components/StorageAuthFix.tsx` - ❌ использует Supabase
- `src/components/DatabaseTest.tsx` - ❌ использует Supabase

**Основные компоненты:**
- `src/components/contract/DocumentApprovalActions.tsx` - ❌ использует Supabase
- `src/components/QualificationWorkSchedule.tsx` - ⚠️ использует сервисы, которые работают с Supabase (косвенное использование)

**Роутинг:**
- `src/App.tsx` - ⚠️ содержит импорты и роуты для Supabase компонентов (supabase-test, supabase-auth-init)

### 3. Настройка аутентификации
- Создать API endpoints для аутентификации (login, logout, register)
- Реализовать JWT токены или сессии
- Обновить middleware аутентификации на бэкенде

### 4. Настройка Storage
- Бэкенд уже имеет роут `/api/storage` для работы с файлами
- Нужно обновить все сервисы для использования API вместо Supabase Storage
- Проверить работу загрузки/скачивания файлов через API

### 5. Обновление тестов
Тестовые файлы, использующие моки Supabase (4 файла):
- `src/utils/__tests__/documentApprovalService.test.ts` - использует моки Supabase
- `src/utils/__tests__/loggerDataService.test.ts` - использует моки Supabase
- `src/utils/__tests__/qualificationWorkScheduleService.test.ts` - использует моки Supabase
- `src/utils/__tests__/qualificationObjectService.test.ts` - использует моки Supabase
- `src/components/__tests__/QualificationWorkSchedule.test.tsx` - использует моки Supabase

### 6. Удаление зависимостей Supabase
После полной миграции можно удалить:
- `@supabase/supabase-js` из `package.json`
- Файл `src/utils/supabaseClient.ts`
- Диагностические компоненты Supabase (или переделать их на API тесты):
  - `src/components/SupabaseConnectionTest.tsx`
  - `src/components/SupabaseAuthInit.tsx`
  - `src/components/StorageDiagnostic.tsx`
  - `src/components/StorageRLSManager.tsx`
  - `src/components/RLSManager.tsx`
  - `src/components/BucketDiagnostic.tsx`
  - `src/components/StorageAuthFix.tsx`
  - `src/components/DatabaseTest.tsx`

## 📊 Статистика миграции

**Всего файлов с использованием Supabase:** 31 файл

**По категориям:**
- Сервисы данных: 13 файлов (1 частично обновлен)
- Компоненты: 11 файлов (1 косвенно использует)
- Тесты: 5 файлов
- Роутинг: 1 файл
- Базовые утилиты: 1 файл

**Статус:**
- ✅ Полностью готово: 2 файла (apiClient.ts, apply-migrations.ts)
- ⚠️ Частично готово: 3 файла
- ❌ Требует миграции: 26 файлов

## 📝 Рекомендации по дальнейшей работе

### Приоритет 1 (Критично) - 13 файлов
1. **Сервисы данных** (12 файлов):
   - Заменить Supabase на API во всех сервисах данных
   - Начать с наиболее используемых: `qualificationObjectService.ts`, `testingPeriodService.ts`, `loggerDataService.ts`
   - Затем обновить остальные сервисы

2. **Аутентификация** (1 файл):
   - Настроить аутентификацию через API
   - Обновить `SecureAuthManager.tsx` для работы с API

### Приоритет 2 (Важно) - 10 файлов
1. **Основные компоненты** (2 файла):
   - `src/components/contract/DocumentApprovalActions.tsx`
   - `src/components/QualificationWorkSchedule.tsx` (после обновления сервисов)

2. **Диагностические компоненты** (7 файлов):
   - Переделать на API тесты или удалить:
     - `SupabaseConnectionTest.tsx` → `ApiConnectionTest.tsx`
     - `SupabaseAuthInit.tsx` → удалить или переделать
     - `StorageDiagnostic.tsx` → `StorageApiTest.tsx`
     - `StorageRLSManager.tsx` → удалить (RLS не нужен для PostgreSQL)
     - `RLSManager.tsx` → удалить
     - `BucketDiagnostic.tsx` → `StorageApiTest.tsx`
     - `StorageAuthFix.tsx` → удалить
     - `DatabaseTest.tsx` → `DatabaseApiTest.tsx`

3. **Роутинг** (1 файл):
   - Обновить `src/App.tsx` - убрать роуты для Supabase компонентов

### Приоритет 3 (Желательно) - 5 файлов
1. **Тесты** (5 файлов):
   - Обновить тесты для работы с API моками вместо Supabase
   - Использовать MSW (Mock Service Worker) для мокирования API

2. **Оптимизация:**
   - Оптимизировать API запросы
   - Добавить кэширование на фронтенде
   - Улучшить обработку ошибок

## 🔧 Пошаговый план миграции

### Этап 1: Сервисы данных (Приоритет 1)

**Шаг 1.1: qualificationObjectService.ts** (частично готов)
- [ ] Заменить `createQualificationObject` на `apiClient.post('/api/qualification-objects')`
- [ ] Заменить `updateQualificationObject` на `apiClient.put('/api/qualification-objects/:id')`
- [ ] Заменить `deleteQualificationObject` на `apiClient.delete('/api/qualification-objects/:id')`
- [ ] Заменить `updateMeasurementZones` на API вызов
- [ ] Заменить `uploadPlanFile` на `apiClient.uploadFile('/api/storage/upload')`
- [ ] Заменить `uploadTestDataFile` на `apiClient.uploadFile('/api/storage/upload')`
- [ ] Заменить `uploadLoggerRemovalFile` на `apiClient.uploadFile('/api/storage/upload')`
- [ ] Заменить `deleteLoggerRemovalFile` на `apiClient.post('/api/storage/remove')`
- [ ] Заменить `getLoggerRemovalFiles` на `apiClient.post('/api/storage/list')`

**Шаг 1.2: testingPeriodService.ts**
- [ ] Заменить все вызовы `supabase.from('qualification_object_testing_periods')` на API
- [ ] Использовать `apiClient.get/post/put/delete('/api/testing-periods')`

**Шаг 1.3: loggerDataService.ts**
- [ ] Заменить вызовы Supabase на `apiClient.get/post('/api/logger-data')`

**Шаг 1.4: Остальные сервисы** (по аналогии)
- [ ] `reportService.ts` → `/api/reports`
- [ ] `auditService.ts` → `/api/audit-logs`
- [ ] `projectDocumentService.ts` → `/api/project-documents`
- [ ] `uploadedFileService.ts` → `/api/uploaded-files`
- [ ] `documentApprovalService.ts` → `/api/document-approval`
- [ ] `qualificationProtocolService.ts` → `/api/qualification-protocols`
- [ ] `qualificationWorkScheduleService.ts` → `/api/qualification-work-schedule`
- [ ] `documentationCheckService.ts` → `/api/documentation-checks`
- [ ] `projectPeriodService.ts` → использовать API через другие сервисы

### Этап 2: Аутентификация (Приоритет 1)

**Шаг 2.1: Создать API endpoints для аутентификации**
- [ ] Создать `server/routes/auth.ts` с endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/auth/register`
  - `GET /api/auth/me`

**Шаг 2.2: Обновить компоненты аутентификации**
- [ ] Обновить `SecureAuthManager.tsx` для использования API
- [ ] Удалить или переделать `SupabaseAuthInit.tsx`

### Этап 3: Компоненты (Приоритет 2)

**Шаг 3.1: Основные компоненты**
- [x] Обновить `DocumentApprovalActions.tsx` после обновления сервисов ✅
- [x] Обновить `QualificationWorkSchedule.tsx` после обновления сервисов ✅

**Шаг 3.2: Диагностические компоненты**
- [x] Переделать или удалить диагностические компоненты Supabase ✅
- [x] Создать новые API тестовые компоненты при необходимости ✅

**Шаг 3.3: Роутинг**
- [x] Обновить `App.tsx` - убрать роуты для Supabase компонентов ✅

### Этап 4: Тесты (Приоритет 3)

**Шаг 4.1: Обновить тесты**
- [ ] Заменить моки Supabase на моки API (MSW)
- [ ] Обновить все тестовые файлы

### Этап 5: Очистка (После завершения)

**Шаг 5.1: Удаление зависимостей**
- [ ] Удалить `@supabase/supabase-js` из `package.json` (опционально, если не используется в тестах)
- [x] Удалить `src/utils/supabaseClient.ts` ✅
- [x] Удалить неиспользуемые диагностические компоненты ✅

**Шаг 5.2: Финальная проверка**
- [ ] Проверить все функции приложения
- [ ] Убедиться, что данные корректно сохраняются и загружаются
- [ ] Проверить работу загрузки файлов
- [ ] Проверить аутентификацию

## 📚 Полезные файлы

**База данных:**
- `database_setup.sql` - основная структура БД
- `server/scripts/apply-migrations.ts` - скрипт для применения миграций
- `supabase/migrations/` - дополнительные миграции

**API:**
- `server/routes/` - API endpoints (уже реализованы):
  - `users.ts` - пользователи
  - `projects.ts` - проекты
  - `equipment.ts` - оборудование
  - `contractors.ts` - подрядчики
  - `qualificationObjects.ts` - объекты квалификации
  - `qualificationProtocols.ts` - протоколы квалификации
  - `qualificationWorkSchedule.ts` - расписание работ
  - `testingPeriods.ts` - периоды испытаний
  - `loggerData.ts` - данные логгеров
  - `uploadedFiles.ts` - загруженные файлы
  - `projectDocuments.ts` - документы проекта
  - `documentApproval.ts` - согласование документов
  - `auditLogs.ts` - логи аудита
  - `reports.ts` - отчеты
  - `tenders.ts` - тендеры
  - `storage.ts` - хранилище файлов
  - `dbProxy.ts` - прокси для прямых SQL запросов

**Клиент:**
- `src/utils/apiClient.ts` - клиент для работы с API

**Документация:**
- `MIGRATIONS_README.md` - руководство по миграциям
- `DEPLOYMENT_SERVER_INSTRUCTIONS.md` - инструкции по развертыванию
- `POSTGRESQL_MIGRATION_STATUS.md` - этот файл (статус миграции)

