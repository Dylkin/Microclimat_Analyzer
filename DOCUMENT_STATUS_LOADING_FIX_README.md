# Исправление загрузки статусов и комментариев документов

## Проблема
При повторном открытии проекта на странице "Согласование договора" в блоке "Согласование документов" не отображались установленные ранее пользователем статусы и введенные комментарии.

## Причина
Компоненты `DocumentComments` и `DocumentApprovalActions` загружали данные только при инициализации, но не обновлялись при изменении документов. Основной компонент `DocumentApproval` не загружал реальные статусы из базы данных, полагаясь только на локальное состояние.

## Решение

### 1. Исправление DocumentComments

**Файл:** `src/components/contract/DocumentComments.tsx`

#### Обновлена загрузка комментариев:
```typescript
// Загрузка комментариев
useEffect(() => {
  const loadComments = async () => {
    try {
      // Если это временный ID, не загружаем комментарии
      if (documentId.startsWith('temp-')) {
        setComments([]);
        return;
      }

      console.log('Загрузка комментариев для документа:', documentId);
      const commentsData = await documentApprovalService.getComments(documentId);
      console.log('Загружены комментарии:', commentsData);
      setComments(commentsData);
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
      setComments([]);
    }
  };

  if (documentId) {
    loadComments();
  }
}, [documentId]);
```

**Изменения:**
- ✅ Добавлена проверка на существование `documentId`
- ✅ Добавлено логирование для отладки
- ✅ Улучшена обработка ошибок

### 2. Исправление DocumentApprovalActions

**Файл:** `src/components/contract/DocumentApprovalActions.tsx`

#### Обновлена загрузка истории согласований:
```typescript
// Загрузка истории согласований
useEffect(() => {
  const loadApprovalHistory = async () => {
    try {
      console.log('Загрузка истории согласований для документа:', documentId);
      const history = await documentApprovalService.getApprovalHistory(documentId);
      console.log('Загружена история согласований:', history);
      setApprovalHistory(history);
    } catch (error) {
      console.error('Ошибка загрузки истории согласований:', error);
      setApprovalHistory([]);
    }
  };

  if (documentId) {
    loadApprovalHistory();
  }
}, [documentId]);
```

**Изменения:**
- ✅ Добавлена проверка на существование `documentId`
- ✅ Добавлено логирование для отладки
- ✅ Улучшена обработка ошибок

### 3. Исправление DocumentApproval

**Файл:** `src/components/contract/DocumentApproval.tsx`

#### Добавлены импорты:
```typescript
import React, { useMemo, useState, useEffect } from 'react';
import { documentApprovalService, DocumentApprovalStatus } from '../../utils/documentApprovalService';
```

#### Добавлено состояние для статусов:
```typescript
// Состояние для хранения статусов документов из базы данных
const [documentStatuses, setDocumentStatuses] = useState<Map<string, DocumentApprovalStatus>>(new Map());
```

#### Добавлена функция загрузки статусов:
```typescript
// Загрузка статусов документов из базы данных
const loadDocumentStatuses = async () => {
  const allDocuments = [
    commercialOfferDoc,
    contractDoc,
    ...(qualificationProtocols?.map(p => p.document).filter(Boolean) || [])
  ].filter(Boolean) as ProjectDocument[];

  const statusPromises = allDocuments.map(async (doc) => {
    try {
      const status = await documentApprovalService.getApprovalStatus(doc.id);
      return { documentId: doc.id, status };
    } catch (error) {
      console.error(`Ошибка загрузки статуса для документа ${doc.id}:`, error);
      return { documentId: doc.id, status: null };
    }
  });

  const results = await Promise.all(statusPromises);
  const statusMap = new Map<string, DocumentApprovalStatus>();
  
  results.forEach(({ documentId, status }) => {
    if (status) {
      statusMap.set(documentId, status);
    }
  });

  setDocumentStatuses(statusMap);
};
```

#### Добавлен useEffect для загрузки статусов:
```typescript
// Загружаем статусы при изменении документов
useEffect(() => {
  loadDocumentStatuses();
}, [commercialOfferDoc?.id, contractDoc?.id, qualificationProtocols]);
```

#### Обновлена функция renderDocumentSection:
```typescript
const renderDocumentSection = (
  title: string,
  document?: ProjectDocument,
  documentType: 'commercial_offer' | 'contract' = 'commercial_offer'
) => {
  // Получаем статус из базы данных
  const dbStatus = document ? documentStatuses.get(document.id) : undefined;
  const isApproved = document ? approvedDocuments.has(document.id) : false;
  const approvalInfo = document ? documentApprovals.get(document.id) : undefined;
  
  // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
  const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
  
  // ... остальная логика
};
```

#### Обновлена передача статуса в DocumentApprovalActions:
```typescript
<DocumentApprovalActions
  documentId={document.id}
  documentType={documentType}
  currentStatus={currentStatus}  // Теперь использует реальный статус из БД
  isCancelBlocked={isApprovalCancelBlocked(documentType)}
  onStatusChange={(status, comment) => {
    if (status === 'approved') {
      handleDocumentApproval(document.id);
    } else if (status === 'pending') {
      onUnapprove(document.id);
    } else if (status === 'rejected') {
      console.log('Document rejected:', document.id, comment);
    }
    // Обновляем статусы после изменения
    loadDocumentStatuses();
  }}
/>
```

## Результат

### До исправления:
- ❌ Комментарии не отображались при повторном открытии проекта
- ❌ Статусы согласования не загружались из базы данных
- ❌ История согласований была пустой
- ❌ Данные терялись между сессиями

### После исправления:
- ✅ Комментарии загружаются и отображаются при повторном открытии
- ✅ Статусы согласования загружаются из базы данных
- ✅ История согласований отображается полностью
- ✅ Данные сохраняются между сессиями
- ✅ Добавлено логирование для отладки

## Технические детали

### Приоритет статусов:
1. **Статус из базы данных** (через `documentApprovalService.getApprovalStatus()`)
2. **Локальный статус** (через `approvedDocuments` Set)

### Загрузка данных:
- **Комментарии**: загружаются через `documentApprovalService.getComments()`
- **История согласований**: загружаются через `documentApprovalService.getApprovalHistory()`
- **Статусы документов**: загружаются через `documentApprovalService.getApprovalStatus()`

### Обновление данных:
- При изменении `documentId` компоненты автоматически перезагружают данные
- После изменения статуса вызывается `loadDocumentStatuses()` для обновления
- Логирование помогает отслеживать процесс загрузки данных

## Установка и запуск

### Запуск приложения:
```bash
start_with_document_status_fix.bat
```

### Проверка работы:
1. Откройте страницу "Согласование договора"
2. Добавьте комментарии к документам
3. Согласуйте или отклоните документы
4. Обновите страницу или перезапустите приложение
5. Комментарии и статусы должны отображаться

### Отладка:
- Откройте консоль браузера (F12)
- При загрузке страницы должны появиться логи:
  - "Загрузка комментариев для документа: [ID]"
  - "Загружены комментарии: [данные]"
  - "Загрузка истории согласований для документа: [ID]"
  - "Загружена история согласований: [данные]"

## Файлы изменены:
- `src/components/contract/DocumentComments.tsx` - улучшена загрузка комментариев
- `src/components/contract/DocumentApprovalActions.tsx` - улучшена загрузка истории
- `src/components/contract/DocumentApproval.tsx` - добавлена загрузка статусов из БД
- `start_with_document_status_fix.bat` - скрипт запуска
- `DOCUMENT_STATUS_LOADING_FIX_README.md` - документация

## Проверка в базе данных:
```sql
-- Просмотр комментариев
SELECT * FROM document_comments ORDER BY created_at DESC;

-- Просмотр согласований
SELECT * FROM document_approvals ORDER BY created_at DESC;

-- Просмотр статусов по документам
SELECT 
  document_id,
  status,
  COUNT(*) as count
FROM document_approvals 
GROUP BY document_id, status
ORDER BY document_id;
```























