# Исправление ошибки "Cannot access 'commercialOfferDoc' before initialization"

## Проблема

В компоненте `ContractNegotiation.tsx` возникала ошибка:
```
Uncaught ReferenceError: Cannot access 'commercialOfferDoc' before initialization
```

## Причина

Ошибка возникала из-за неправильного порядка объявления переменных в коде:

1. В `useEffect` на строке 137 использовались переменные `commercialOfferDoc` и `contractDoc`
2. Но эти переменные были объявлены только на строках 262-263
3. JavaScript пытался использовать переменные до их инициализации

## Решение

Переместили объявление переменных `commercialOfferDoc` и `contractDoc` выше в коде:

### До исправления:
```typescript
// В useEffect (строка 137)
}, [approvedDocuments, commercialOfferDoc, contractDoc, isDocumentAccordionExpanded]);

// ... много кода ...

// Объявление переменных (строки 262-263)
const commercialOfferDoc = documents.find(doc => doc.documentType === 'commercial_offer');
const contractDoc = documents.find(doc => doc.documentType === 'contract');
```

### После исправления:
```typescript
// Объявление переменных сразу после состояния (строки 45-47)
const commercialOfferDoc = documents.find(doc => doc.documentType === 'commercial_offer');
const contractDoc = documents.find(doc => doc.documentType === 'contract');

// ... код с useEffect ...

// В useEffect теперь переменные доступны
}, [approvedDocuments, commercialOfferDoc, contractDoc, isDocumentAccordionExpanded]);
```

## Изменения в коде

**Файл:** `src/components/ContractNegotiation.tsx`

1. **Добавлено объявление переменных после состояния:**
```typescript
const [qualificationProtocols, setQualificationProtocols] = useState<QualificationProtocol[]>([]);
const [isDocumentAccordionExpanded, setIsDocumentAccordionExpanded] = useState(true);

// Get documents by type - moved up to avoid reference errors
const commercialOfferDoc = documents.find(doc => doc.documentType === 'commercial_offer');
const contractDoc = documents.find(doc => doc.documentType === 'contract');
```

2. **Удалено дублирующее объявление переменных:**
```typescript
// Удалены строки:
// const commercialOfferDoc = documents.find(doc => doc.documentType === 'commercial_offer');
// const contractDoc = documents.find(doc => doc.documentType === 'contract');
```

## Результат

- ✅ Ошибка "Cannot access 'commercialOfferDoc' before initialization" исправлена
- ✅ Компонент `ContractNegotiation` теперь корректно инициализируется
- ✅ Аккордеон для согласования документов работает без ошибок
- ✅ Все функции определения статуса документов работают корректно

## Урок

При использовании переменных в `useEffect` или других хуках, необходимо убедиться, что эти переменные объявлены до их использования. В React компонентах порядок объявления переменных имеет значение для корректной работы кода.























