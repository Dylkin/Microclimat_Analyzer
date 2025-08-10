import html2canvas from 'html2canvas';

/**
 * Утилита для экспорта таблицы в DOCX формат
 */
export class TableExportUtils {

  /**
   * Создает изображение таблицы для вставки в шаблон
   */
  static async createTableImage(tableElement: HTMLElement): Promise<Blob> {
    try {
      console.log('Создаем изображение таблицы для шаблона...');
      
      // Создаем скриншот таблицы
      const canvas = await html2canvas(tableElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tableElement.offsetWidth,
        height: tableElement.offsetHeight
      });
      
      console.log('Изображение таблицы создано, размер:', canvas.width, 'x', canvas.height);
      
      // Конвертируем в blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('Blob изображения таблицы создан, размер:', blob.size, 'байт');
            resolve(blob);
          } else {
            reject(new Error('Ошибка создания изображения таблицы'));
          }
        }, 'image/png', 1.0);
      });
      
    } catch (error) {
      console.error('Ошибка создания изображения таблицы:', error);
      throw new Error(`Ошибка создания изображения таблицы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }
}