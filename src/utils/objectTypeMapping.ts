// Утилиты для маппинга типов объектов квалификации

// Маппинг кириллических типов объектов на безопасные имена для файлов
export const objectTypeMapping: { [key: string]: string } = {
  'помещение': 'room',
  'автомобиль': 'vehicle',
  'холодильник': 'refrigerator',
  'морозильник': 'freezer',
  'холодильная_камера': 'cold_chamber'
};

// Обратный маппинг: от безопасных имен к кириллическим
export const reverseObjectTypeMapping: { [key: string]: string } = {
  'room': 'помещение',
  'vehicle': 'автомобиль',
  'refrigerator': 'холодильник',
  'freezer': 'морозильник',
  'cold_chamber': 'холодильная_камера'
};

/**
 * Преобразует кириллический тип объекта в безопасное имя для файла
 */
export function getSafeObjectType(objectType: string): string {
  return objectTypeMapping[objectType] || objectType.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Преобразует безопасное имя файла обратно в кириллический тип объекта
 */
export function getOriginalObjectType(safeObjectType: string): string {
  return reverseObjectTypeMapping[safeObjectType] || safeObjectType;
}

/**
 * Извлекает тип объекта из имени файла протокола
 */
export function extractObjectTypeFromFileName(fileName: string): string | null {
  const match = fileName.match(/qualification_protocol_([^_]+)_/);
  if (match) {
    const safeObjectType = match[1];
    return getOriginalObjectType(safeObjectType);
  }
  return null;
}

/**
 * Получает отображаемое название типа объекта
 */
export function getObjectTypeDisplayName(objectType: string): string {
  const displayNames: { [key: string]: string } = {
    'помещение': 'Помещение',
    'автомобиль': 'Автомобиль',
    'холодильник': 'Холодильник',
    'морозильник': 'Морозильник',
    'холодильная_камера': 'Холодильная камера'
  };
  
  return displayNames[objectType] || objectType;
}

























