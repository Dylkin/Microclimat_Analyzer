import html2canvas from 'html2canvas';
import htmlToDocx from 'html-to-docx';

/**
 * Утилита для экспорта таблицы в DOCX формат
 */
export class TableExportUtils {
  /**
   * Улучшает стили таблицы для лучшего качества экспорта
   */
  static enhanceTableForExport(element: HTMLElement): () => void {
    const originalStyles = new Map<Element, string>();
    
    // Сохраняем оригинальные стили и применяем улучшенные
    element.querySelectorAll('td, th').forEach(el => {
      const htmlEl = el as HTMLElement;
      originalStyles.set(el, htmlEl.style.cssText);
      
      // Увеличиваем размер шрифтов для лучшей читаемости
      htmlEl.style.fontSize = '12pt';
      htmlEl.style.lineHeight = '1.4';
      htmlEl.style.padding = '8px';
    });
    
    // Сохраняем стили контейнера
    const containerOriginalStyle = element.style.cssText;
    
    // Упрощаем сложные стили контейнера
    element.style.boxShadow = 'none';
    element.style.transform = 'none';
    element.style.borderRadius = '0';
    element.style.backgroundColor = '#ffffff';
    
    // Возвращаем функцию для восстановления оригинальных стилей
    return () => {
      originalStyles.forEach((originalStyle, el) => {
        (el as HTMLElement).style.cssText = originalStyle;
      });
      element.style.cssText = containerOriginalStyle;
    };
  }

  /**
   * Экспортирует таблицу в DOCX используя html2canvas
   */
  static async exportTableToDocx(tableElement: HTMLElement, fileName: string): Promise<Blob> {
    try {
      console.log('Начинаем экспорт таблицы в DOCX...');
      
      // Улучшаем стили для экспорта
      const restoreStyles = this.enhanceTableForExport(tableElement);
      
      try {
        // Создаем скриншот таблицы с высоким качеством
        const canvas = await html2canvas(tableElement, {
          scale: 2, // Увеличиваем качество
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: tableElement.offsetWidth,
          height: tableElement.offsetHeight
        });
        
        console.log('Скриншот таблицы создан, размер:', canvas.width, 'x', canvas.height);
        
        // Конвертируем canvas в base64
        const imageData = canvas.toDataURL('image/png', 1.0);
        
        // Создаем HTML-обертку с изображением таблицы
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .table-container { 
                width: 100%; 
                text-align: center; 
                page-break-inside: avoid;
              }
              .table-image { 
                max-width: 100%; 
                height: auto; 
                border: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <div class="table-container">
              <img src="${imageData}" class="table-image" alt="Таблица результатов анализа" />
            </div>
          </body>
          </html>
        `;
        
        // Конвертируем HTML в DOCX
        const docxBuffer = await htmlToDocx(htmlContent, null, {
          orientation: 'portrait',
          margins: { 
            top: 1000,    // 1 см
            right: 1000,  // 1 см  
            bottom: 1000, // 1 см
            left: 1000    // 1 см
          }
        });
        
        console.log('DOCX буфер создан, размер:', docxBuffer.byteLength, 'байт');
        
        return new Blob([docxBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        
      } finally {
        // Восстанавливаем оригинальные стили
        restoreStyles();
      }
      
    } catch (error) {
      console.error('Ошибка при экспорте таблицы в DOCX:', error);
      throw new Error(`Ошибка экспорта таблицы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создает изображение таблицы для вставки в шаблон
   */
  static async createTableImage(tableElement: HTMLElement): Promise<Blob> {
    try {
      console.log('Создаем изображение таблицы для шаблона...');
      
      // Улучшаем стили для экспорта
      const restoreStyles = this.enhanceTableForExport(tableElement);
      
      try {
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
        
      } finally {
        // Восстанавливаем оригинальные стили
        restoreStyles();
      }
      
    } catch (error) {
      console.error('Ошибка создания изображения таблицы:', error);
      throw new Error(`Ошибка создания изображения таблицы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }
}