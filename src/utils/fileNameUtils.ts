/**
 * Утилиты для работы с именами файлов
 */

/**
 * Очищает имя файла от недопустимых символов для URL-путей
 * @param fileName - исходное имя файла
 * @returns очищенное имя файла
 */
export function sanitizeFileName(fileName: string): string {
  // Получаем расширение файла
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  const nameWithoutExtension = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  
  // Создаем маппинг кириллических символов
  const cyrillicMap: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };
  
  // Заменяем кириллические символы по одному
  let transliterated = '';
  for (let i = 0; i < nameWithoutExtension.length; i++) {
    const char = nameWithoutExtension[i];
    if (cyrillicMap[char] !== undefined) {
      transliterated += cyrillicMap[char];
    } else {
      transliterated += char;
    }
  }
  
  // Заменяем пробелы и специальные символы на подчеркивания
  transliterated = transliterated
    .replace(/[\s\-\.\,\!\?\:\;\(\)\[\]\{\}\+\=\*\/\\\|\<\>\@\#\$\%\^\&\~\`]/g, '_')
    // Удаляем множественные подчеркивания
    .replace(/_+/g, '_')
    // Удаляем подчеркивания в начале и конце
    .replace(/^_+|_+$/g, '')
    // Ограничиваем длину имени файла
    .substring(0, 100);
  
  return transliterated + extension;
}

/**
 * Генерирует безопасное имя файла с временной меткой
 * @param originalFileName - исходное имя файла
 * @param prefix - префикс для имени файла (опционально)
 * @returns безопасное имя файла с временной меткой
 */
export function generateSafeFileName(originalFileName: string, prefix?: string): string {
  const sanitized = sanitizeFileName(originalFileName);
  const timestamp = Date.now();
  
  if (prefix) {
    return `${prefix}_${timestamp}_${sanitized}`;
  }
  
  return `${timestamp}_${sanitized}`;
}
