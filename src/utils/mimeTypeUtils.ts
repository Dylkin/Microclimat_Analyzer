/**
 * Утилиты для определения MIME-типов файлов
 */

/**
 * Определяет MIME-тип файла по его расширению
 * @param filename - имя файла
 * @returns MIME-тип файла
 */
export const getMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  
  const mimeTypes: { [key: string]: string } = {
    // Видео файлы
    'vi2': 'application/octet-stream', // Файлы .vi2 определяем как бинарные данные
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    
    // Аудио файлы
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    
    // Документы
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    
    // Изображения
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    
    // Архивы
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // CSV файлы
    'csv': 'text/csv',
    
    // JSON файлы
    'json': 'application/json',
    
    // XML файлы
    'xml': 'application/xml',
    
    // Бинарные файлы данных
    'dat': 'application/octet-stream',
    'bin': 'application/octet-stream',
    'exe': 'application/octet-stream',
    'dll': 'application/octet-stream'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

/**
 * Проверяет, является ли файл видео файлом
 * @param filename - имя файла
 * @returns true, если файл является видео
 */
export const isVideoFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename);
  return mimeType.startsWith('video/');
};

/**
 * Проверяет, является ли файл аудио файлом
 * @param filename - имя файла
 * @returns true, если файл является аудио
 */
export const isAudioFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename);
  return mimeType.startsWith('audio/');
};

/**
 * Проверяет, является ли файл изображением
 * @param filename - имя файла
 * @returns true, если файл является изображением
 */
export const isImageFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename);
  return mimeType.startsWith('image/');
};

/**
 * Проверяет, является ли файл документом
 * @param filename - имя файла
 * @returns true, если файл является документом
 */
export const isDocumentFile = (filename: string): boolean => {
  const mimeType = getMimeType(filename);
  return mimeType.includes('pdf') || 
         mimeType.includes('document') || 
         mimeType.includes('sheet') || 
         mimeType.includes('presentation') ||
         mimeType === 'text/plain' ||
         mimeType === 'text/csv';
};

/**
 * Получает описание типа файла для пользователя
 * @param filename - имя файла
 * @returns описание типа файла
 */
export const getFileTypeDescription = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  
  const descriptions: { [key: string]: string } = {
    'vi2': 'Видео файл логгера',
    'mp4': 'Видео файл MP4',
    'avi': 'Видео файл AVI',
    'mov': 'Видео файл MOV',
    'pdf': 'PDF документ',
    'doc': 'Документ Word',
    'docx': 'Документ Word',
    'xls': 'Таблица Excel',
    'xlsx': 'Таблица Excel',
    'csv': 'CSV файл',
    'txt': 'Текстовый файл',
    'jpg': 'Изображение JPEG',
    'jpeg': 'Изображение JPEG',
    'png': 'Изображение PNG',
    'gif': 'Изображение GIF'
  };
  
  return descriptions[ext || ''] || 'Файл';
};

