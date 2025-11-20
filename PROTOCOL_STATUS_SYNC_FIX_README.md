# Исправление синхронизации статуса протоколов квалификации

## Проблема
В блоке "Протоколы квалификации" в истории согласований отображались записи о согласовании, но:
- ❌ Состояние кнопки не обновлялось (оставалось "Согласование" вместо "Отменить согласование")
- ❌ Прогресс согласования не обновлялся (показывал "0 из 4 документов согласовано" вместо "4 из 4")
- ❌ Иконки статуса не отображали правильное состояние
- ❌ История согласований не была синхронизирована с состоянием кнопок

## Причина
Для протоколов квалификации использовалась только локальная логика определения статуса (`approvedDocuments.has(protocolDoc.id)`), а не реальные данные из базы данных. Это приводило к рассинхронизации между:
- Данными в базе данных (реальные статусы согласования)
- Отображением в интерфейсе (локальное состояние)

## Решение

### 1. Исправление статуса кнопки для протоколов квалификации

**Файл:** `src/components/contract/DocumentApproval.tsx`

#### Было:
```typescript
<DocumentApprovalActions
  documentId={protocolDoc.id}
  documentType="qualification_protocol"
  currentStatus={approvedDocuments.has(protocolDoc.id) ? 'approved' : 'pending'}
  // ...
/>
```

#### Стало:
```typescript
<DocumentApprovalActions
  documentId={protocolDoc.id}
  documentType="qualification_protocol"
  currentStatus={(() => {
    // Получаем статус из базы данных
    const dbStatus = documentStatuses.get(protocolDoc.id);
    const isApproved = approvedDocuments.has(protocolDoc.id);
    // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
    return dbStatus?.status || (isApproved ? 'approved' : 'pending');
  })()}
  onStatusChange={(status, comment) => {
    if (status === 'approved') {
      onApprove(protocolDoc.id);
    } else if (status === 'pending') {
      onUnapprove(protocolDoc.id);
    }
    // Обновляем статусы после изменения
    loadDocumentStatuses();
  }}
  // ...
/>
```

**Изменения:**
- ✅ Используется реальный статус из базы данных
- ✅ Приоритет у данных из БД, fallback к локальному состоянию
- ✅ Добавлено обновление статусов после изменения

### 2. Исправление иконки статуса для протоколов

#### Было:
```typescript
{getStatusIcon(!!protocolDoc, protocolDoc ? approvedDocuments.has(protocolDoc.id) : false)}
```

#### Стало:
```typescript
{getStatusIcon(!!protocolDoc, protocolDoc ? (() => {
  // Получаем статус из базы данных
  const dbStatus = documentStatuses.get(protocolDoc.id);
  const isApproved = approvedDocuments.has(protocolDoc.id);
  // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
  const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
  return currentStatus === 'approved';
})() : false)}
```

**Изменения:**
- ✅ Иконка статуса использует реальные данные из базы
- ✅ Синхронизирована с состоянием кнопки

### 3. Исправление прогресса согласования

#### Было:
```typescript
const progressData = useMemo(() => {
  const commercialOfferApproved = commercialOfferDoc ? approvedDocuments.has(commercialOfferDoc.id) : false;
  const contractApproved = contractDoc ? approvedDocuments.has(contractDoc.id) : false;
  const protocolApprovedCount = qualificationProtocols?.filter(protocol => 
    protocol.document && approvedDocuments.has(protocol.document.id)
  ).length || 0;
  // ...
}, [commercialOfferDoc, contractDoc, qualificationProtocols, approvedDocuments]);
```

#### Стало:
```typescript
const progressData = useMemo(() => {
  // Определяем статус коммерческого предложения
  const commercialOfferApproved = commercialOfferDoc ? (() => {
    const dbStatus = documentStatuses.get(commercialOfferDoc.id);
    const isApproved = approvedDocuments.has(commercialOfferDoc.id);
    const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
    return currentStatus === 'approved';
  })() : false;
  
  // Определяем статус договора
  const contractApproved = contractDoc ? (() => {
    const dbStatus = documentStatuses.get(contractDoc.id);
    const isApproved = approvedDocuments.has(contractDoc.id);
    const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
    return currentStatus === 'approved';
  })() : false;
  
  // Определяем количество согласованных протоколов
  const protocolApprovedCount = qualificationProtocols?.filter(protocol => {
    if (!protocol.document) return false;
    const dbStatus = documentStatuses.get(protocol.document.id);
    const isApproved = approvedDocuments.has(protocol.document.id);
    const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
    return currentStatus === 'approved';
  }).length || 0;
  // ...
}, [commercialOfferDoc, contractDoc, qualificationProtocols, approvedDocuments, documentStatuses]);
```

**Изменения:**
- ✅ Прогресс использует реальные статусы из базы данных
- ✅ Добавлена зависимость `documentStatuses` в useMemo
- ✅ Все документы (коммерческое предложение, договор, протоколы) используют единую логику

## Результат

### До исправления:
- ❌ Кнопка "Согласование" не менялась на "Отменить согласование"
- ❌ Прогресс показывал "0 из 4 документов согласовано" вместо "4 из 4"
- ❌ Иконки статуса не отображали правильное состояние
- ❌ История согласований не была синхронизирована с кнопками

### После исправления:
- ✅ Кнопка "Согласование" меняется на "Отменить согласование" при согласовании
- ✅ Прогресс обновляется корректно (например, "4 из 4 документов согласовано")
- ✅ Иконки статуса отображают правильное состояние
- ✅ История согласований синхронизирована с состоянием кнопок
- ✅ Все статусы загружаются из базы данных при инициализации

## Технические детали

### Приоритет статусов:
1. **Статус из базы данных** (через `documentStatuses.get(documentId)`)
2. **Локальный статус** (через `approvedDocuments.has(documentId)`)

### Обновление данных:
- При изменении статуса вызывается `loadDocumentStatuses()` для обновления
- `useMemo` для `progressData` пересчитывается при изменении `documentStatuses`
- Все компоненты синхронизированы через единую логику определения статуса

### Зависимости:
- `progressData` теперь зависит от `documentStatuses`
- `loadDocumentStatuses()` вызывается при изменении документов
- Статусы обновляются после каждого изменения согласования

## Установка и запуск

### Запуск приложения:
```bash
start_with_protocol_status_fix.bat
```

### Проверка работы:
1. Откройте страницу "Согласование договора"
2. Согласуйте протоколы квалификации
3. Проверьте, что кнопки изменились на "Отменить согласование"
4. Проверьте, что прогресс обновился (например, "4 из 4 документов согласовано")
5. Обновите страницу - статусы должны сохраниться

## Файлы изменены:
- `src/components/contract/DocumentApproval.tsx` - исправлена синхронизация статусов
- `start_with_protocol_status_fix.bat` - скрипт запуска
- `PROTOCOL_STATUS_SYNC_FIX_README.md` - документация

## Проверка в базе данных:
```sql
-- Просмотр согласований протоколов квалификации
SELECT 
  document_id,
  user_name,
  status,
  comment,
  created_at
FROM document_approvals 
WHERE document_id IN (
  SELECT id FROM project_documents 
  WHERE document_type = 'qualification_protocol'
)
ORDER BY created_at DESC;

-- Статистика по статусам протоколов
SELECT 
  status,
  COUNT(*) as count
FROM document_approvals 
WHERE document_id IN (
  SELECT id FROM project_documents 
  WHERE document_type = 'qualification_protocol'
)
GROUP BY status;
```























