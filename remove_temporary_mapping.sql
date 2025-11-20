-- Удаление временного маппинга после обновления enum
-- Этот файл содержит изменения для удаления временного решения

-- В src/utils/projectDocumentService.ts нужно:
-- 1. Удалить строку: const dbDocumentType = documentType === 'qualification_protocol' ? 'contract' : documentType;
-- 2. Заменить dbDocumentType на documentType в upsert запросе
-- 3. Удалить комментарий о временном решении

-- Изменения в коде:
/*
// УДАЛИТЬ эту строку:
const dbDocumentType = documentType === 'qualification_protocol' ? 'contract' : documentType;

// ИЗМЕНИТЬ эту строку:
document_type: dbDocumentType, // Используем маппированный тип для базы данных
// НА:
document_type: documentType,

// УДАЛИТЬ комментарий:
// Временное решение: маппим qualification_protocol на contract для базы данных
*/


























