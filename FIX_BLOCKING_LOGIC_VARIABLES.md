# Исправление логики блокировки - неправильные переменные

## 🎯 **Проблема**

Логика определения блокировки `isCheckboxesBlocked` использует неправильные переменные:

### **Текущая логика (неправильная):**
```typescript
const contractDoc = documents.find(doc => doc.documentType === 'contract');
const isBlocked = contractDoc ? approvedDocuments.has(contractDoc.id) : false;
```

### **Проблемы:**
1. **`documents: []`** - массив документов пустой
2. **`contractDoc: undefined`** - договор не найден
3. **`approvedDocuments: []`** - нет согласованных документов
4. **`isBlocked: false`** - блокировка не работает

## 🔍 **Анализ проблемы**

### **Из логов:**
```
🔒 isCheckboxesBlocked debug:
  - contractDoc: undefined
  - approvedDocuments: []
  - isBlocked: false
  - documents count: 0
  - documents: []
```

### **Из интерфейса:**
- Договор загружен: `649fb9ca-b222-4f63-b2d2-c9cf695a985d_contract_1760379958857.docx`
- Статус: "Согласовано" (зеленая кнопка)
- Дата загрузки: 13.10.2025

## 🔧 **Причина проблемы**

### **1. Неправильные переменные:**
- **Используется**: `documents` и `approvedDocuments` из `ContractNegotiation`
- **Должно использоваться**: `documentStatuses` из `DocumentApproval`

### **2. Разные источники данных:**
- **ContractNegotiation**: Локальное состояние `approvedDocuments`
- **DocumentApproval**: Статусы из базы данных через `documentApprovalService.getApprovalStatus()`

### **3. Асинхронная загрузка:**
- Документы загружаются в `ContractNegotiation`
- Статусы загружаются в `DocumentApproval`
- Блокировка определяется до загрузки статусов

## 🛠️ **Решение**

### **Вариант 1: Использовать documentStatuses из DocumentApproval**

Нужно передать `documentStatuses` из `DocumentApproval` в `ContractNegotiation` и использовать его для определения блокировки.

### **Вариант 2: Синхронизировать состояния**

Синхронизировать `approvedDocuments` в `ContractNegotiation` с реальными статусами из базы данных.

### **Вариант 3: Использовать единый источник истины**

Создать единый сервис для управления статусами документов.

## 📋 **Рекомендуемое решение**

### **Шаг 1: Передать documentStatuses в ContractNegotiation**

```typescript
// В DocumentApproval
const [documentStatuses, setDocumentStatuses] = useState<Map<string, DocumentApprovalStatus>>(new Map());

// Передать в ContractNegotiation
<ContractNegotiation 
  project={project}
  documentStatuses={documentStatuses}
  onBack={onBack}
  onPageChange={onPageChange}
/>
```

### **Шаг 2: Обновить логику блокировки**

```typescript
isCheckboxesBlocked={(() => {
  const contractDoc = documents.find(doc => doc.documentType === 'contract');
  if (!contractDoc) return false;
  
  const dbStatus = documentStatuses.get(contractDoc.id);
  const isApproved = dbStatus?.status === 'approved';
  
  console.log('🔒 isCheckboxesBlocked debug:');
  console.log('  - contractDoc:', contractDoc);
  console.log('  - dbStatus:', dbStatus);
  console.log('  - isApproved:', isApproved);
  
  return isApproved;
})()}
```

## 🧪 **Тестирование**

### **Шаг 1: Проверка загрузки документов**
1. Откройте страницу "Согласование договора"
2. Проверьте, что документы загружаются
3. Убедитесь, что `documents.length > 0`

### **Шаг 2: Проверка загрузки статусов**
1. Проверьте, что статусы загружаются в `DocumentApproval`
2. Убедитесь, что `documentStatuses` содержит статусы документов

### **Шаг 3: Проверка блокировки**
1. Проверьте, что `isCheckboxesBlocked` определяется правильно
2. Убедитесь, что блокировка работает при статусе "Согласовано"

## 📊 **Ожидаемые результаты**

### **После исправления:**
```
🔒 isCheckboxesBlocked debug:
  - contractDoc: { id: "uuid-here", documentType: "contract", ... }
  - dbStatus: { status: "approved", approvedAt: "2025-10-19T23:02:00Z", ... }
  - isApproved: true
  - isBlocked: true
```

### **Поведение:**
- ✅ При статусе "Согласовано" - `isBlocked: true`
- ✅ Кнопки "Просмотр" и "Выполнить" заблокированы
- ✅ Чекбоксы в режиме просмотра

## ✅ **Решение реализовано**

### **1. Обновлен DocumentApproval:**
- Добавлен callback `onDocumentStatusesChange` в интерфейс
- Добавлен вызов callback при изменении статусов
- Статусы передаются в родительский компонент

### **2. Обновлен ContractNegotiation:**
- Добавлено состояние `realDocumentStatuses` для хранения реальных статусов
- Добавлена функция `handleDocumentStatusesChange` для получения статусов
- Обновлена логика блокировки для использования `realDocumentStatuses`

### **3. Новая логика блокировки:**
```typescript
isCheckboxesBlocked={(() => {
  const contractDoc = documents.find(doc => doc.documentType === 'contract');
  if (!contractDoc) return false;
  
  const dbStatus = realDocumentStatuses.get(contractDoc.id);
  const isApproved = dbStatus?.status === 'approved';
  
  return isApproved;
})()}
```

## 🧪 **Тестирование**

### **Ожидаемые результаты:**
```
🔒 isCheckboxesBlocked debug:
  - contractDoc: { id: "8621e2aa-1f20-47dd-8dec-fd3f19632e2b", ... }
  - dbStatus: { status: "approved", lastApproval: {...}, ... }
  - isApproved: true
  - realDocumentStatuses: Map(2) { '21363504-8c32-43e7-b839-d60202d825b7' => {...}, '8621e2aa-1f20-47dd-8dec-fd3f19632e2b' => {...} }
  - documents count: 2
```

### **Поведение:**
- ✅ При статусе "Согласовано" - `isBlocked: true`
- ✅ Кнопки "Просмотр" и "Выполнить" заблокированы
- ✅ Чекбоксы в режиме просмотра

**Проблема решена! Теперь блокировка использует правильные статусы из базы данных.** ✅
