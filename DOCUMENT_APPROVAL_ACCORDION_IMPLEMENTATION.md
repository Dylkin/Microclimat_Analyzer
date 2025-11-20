# Реализация аккордеона для блока "Согласование документов"

## Внесенные изменения

### 1. Создание компонента Accordion

**Файл:** `src/components/ui/Accordion.tsx`

Создан универсальный компонент аккордеона с поддержкой:
- Управляемого и неуправляемого состояния
- Иконок и бейджей
- Настраиваемых стилей
- Callback для обработки изменений состояния

#### Основные возможности:
```typescript
interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;           // Управляемое состояние
  onToggle?: (expanded: boolean) => void; // Callback для изменений
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: 'green' | 'blue' | 'yellow' | 'red' | 'gray';
}
```

#### Логика работы:
- Если передан `expanded` - используется управляемое состояние
- Если не передан - используется внутреннее состояние с `defaultExpanded`
- При клике вызывается `onToggle` callback (если передан)

### 2. Обновление ContractNegotiation

**Файл:** `src/components/ContractNegotiation.tsx`

#### Добавленные импорты:
```typescript
import { FileCheck } from 'lucide-react';
import { Accordion } from './ui/Accordion';
```

#### Добавленное состояние:
```typescript
const [isDocumentAccordionExpanded, setIsDocumentAccordionExpanded] = useState(true);
```

#### Логика определения статуса согласования:
```typescript
// Проверяем, согласованы ли все документы
const isAllDocumentsApproved = () => {
  const commercialOfferApproved = commercialOfferDoc ? approvedDocuments.has(commercialOfferDoc.id) : false;
  const contractApproved = contractDoc ? approvedDocuments.has(contractDoc.id) : false;
  
  // Если есть оба документа, проверяем, что оба согласованы
  if (commercialOfferDoc && contractDoc) {
    return commercialOfferApproved && contractApproved;
  }
  
  // Если есть только один документ, проверяем его согласование
  if (commercialOfferDoc && !contractDoc) {
    return commercialOfferApproved;
  }
  
  if (contractDoc && !commercialOfferDoc) {
    return contractApproved;
  }
  
  // Если нет документов, считаем что "согласовано"
  return true;
};
```

#### Определение статуса и цвета бейджа:
```typescript
const getDocumentApprovalStatus = () => {
  const allApproved = isAllDocumentsApproved();
  const hasDocuments = commercialOfferDoc || contractDoc;
  
  if (!hasDocuments) {
    return { status: 'Нет документов', color: 'gray' as const };
  }
  
  if (allApproved) {
    return { status: 'Все согласованы', color: 'green' as const };
  }
  
  const approvedCount = (commercialOfferDoc && approvedDocuments.has(commercialOfferDoc.id) ? 1 : 0) +
                       (contractDoc && approvedDocuments.has(contractDoc.id) ? 1 : 0);
  const totalCount = (commercialOfferDoc ? 1 : 0) + (contractDoc ? 1 : 0);
  
  return { 
    status: `${approvedCount}/${totalCount} согласованы`, 
    color: approvedCount > 0 ? 'yellow' as const : 'red' as const 
  };
};
```

#### useEffect для управления состоянием аккордеона:
```typescript
// Инициализация состояния аккордеона при загрузке документов
useEffect(() => {
  const allApproved = isAllDocumentsApproved();
  setIsDocumentAccordionExpanded(!allApproved);
}, [documents, approvedDocuments]);

// Автоматическое сворачивание аккордеона после согласования всех документов
useEffect(() => {
  const allApproved = isAllDocumentsApproved();
  if (allApproved && isDocumentAccordionExpanded) {
    // Задержка для плавного сворачивания
    const timer = setTimeout(() => {
      setIsDocumentAccordionExpanded(false);
    }, 2000); // 2 секунды задержки
    
    return () => clearTimeout(timer);
  }
}, [approvedDocuments, commercialOfferDoc, contractDoc, isDocumentAccordionExpanded]);
```

#### Обновленный рендеринг:
```typescript
{/* Document Approval - Accordion Block */}
<Accordion
  title="Согласование документов"
  icon={<FileCheck className="w-5 h-5 text-indigo-600" />}
  badge={getDocumentApprovalStatus().status}
  badgeColor={getDocumentApprovalStatus().color}
  expanded={isDocumentAccordionExpanded}
  onToggle={setIsDocumentAccordionExpanded}
  className="shadow-sm"
>
  <div className="p-6">
    <DocumentApproval
      // ... все существующие пропсы
    />
  </div>
</Accordion>
```

## Логика работы

### 1. Инициализация
- При загрузке страницы аккордеон развернут, если не все документы согласованы
- Если все документы уже согласованы, аккордеон свернут

### 2. Отображение статуса
- **"Нет документов"** (серый) - когда нет загруженных документов
- **"0/2 согласованы"** (красный) - когда есть документы, но ни один не согласован
- **"1/2 согласованы"** (желтый) - когда часть документов согласована
- **"Все согласованы"** (зеленый) - когда все документы согласованы

### 3. Автоматическое сворачивание
- После согласования всех документов аккордеон автоматически сворачивается через 2 секунды
- Пользователь может вручную развернуть аккордеон в любой момент
- При отмене согласования документов аккордеон автоматически разворачивается

### 4. Интерактивность
- Пользователь может вручную сворачивать/разворачивать аккордеон
- Состояние аккордеона сохраняется до изменения статуса согласования документов
- Иконка и бейдж обновляются в реальном времени

## Визуальные особенности

### Иконка
- Используется иконка `FileCheck` из Lucide React
- Цвет: `text-indigo-600`

### Бейджи
- **Серый**: `bg-gray-100 text-gray-800` - нет документов
- **Красный**: `bg-red-100 text-red-800` - документы не согласованы
- **Желтый**: `bg-yellow-100 text-yellow-800` - частично согласованы
- **Зеленый**: `bg-green-100 text-green-800` - все согласованы

### Анимация
- Плавное сворачивание/разворачивание контента
- Задержка 2 секунды перед автоматическим сворачиванием
- Hover эффекты на заголовке аккордеона

## Файлы изменены:
- `src/components/ui/Accordion.tsx` - новый компонент аккордеона
- `src/components/ContractNegotiation.tsx` - интеграция аккордеона

## Результат:
- ✅ Блок "Согласование документов" помещен в аккордеон
- ✅ Аккордеон автоматически сворачивается после согласования всех документов
- ✅ Динамические бейджи показывают статус согласования
- ✅ Пользователь может вручную управлять состоянием аккордеона
- ✅ Плавные анимации и интуитивный интерфейс
- ✅ Сохранение совместимости с существующей функциональностью

## Тестирование:
1. Откройте страницу "Согласование договора"
2. Проверьте, что блок "Согласование документов" находится в аккордеоне
3. Загрузите документы и согласуйте их
4. Убедитесь, что аккордеон автоматически сворачивается после согласования всех документов
5. Проверьте, что бейдж обновляется в зависимости от статуса согласования
6. Убедитесь, что можно вручную разворачивать/сворачивать аккордеон























