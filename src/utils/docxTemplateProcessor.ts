import html2canvas from 'html2canvas';
import PizZip from 'pizzip';

export interface TemplateReportData {
  title: string;
  date: string;
  dataType: 'temperature' | 'humidity';
  analysisResults: any[];
}

export class DocxTemplateProcessor {
  private static instance: DocxTemplateProcessor;

  static getInstance(): DocxTemplateProcessor {
    if (!DocxTemplateProcessor.instance) {
      DocxTemplateProcessor.instance = new DocxTemplateProcessor();
    }
    return DocxTemplateProcessor.instance;
  }

  /**
   * Создание скриншота HTML элемента с поворотом на 90°
   */
  private async createRotatedScreenshot(element: HTMLElement): Promise<ArrayBuffer> {
    // Временно скрываем все кнопки в области графика
    const buttons = element.querySelectorAll('button');
    const originalDisplays: string[] = [];
    buttons.forEach((button, index) => {
      originalDisplays[index] = button.style.display;
      button.style.display = 'none';
    });

    try {
      // Получаем реальные размеры элемента
      const elementRect = element.getBoundingClientRect();
      const originalWidth = elementRect.width;
      const originalHeight = elementRect.height;
      
      console.log('Оригинальные размеры элемента:', { width: originalWidth, height: originalHeight });

      // Создаем скриншот с высоким качеством
      const canvas = await html2canvas(element, {
        scale: 2, // Высокое разрешение
        backgroundColor: '#ffffff', // Белый фон
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: originalWidth,
        height: originalHeight,
        onclone: (clonedDoc) => {
          // Убеждаемся, что в клонированном документе тоже скрыты кнопки
          const clonedButtons = clonedDoc.querySelectorAll('button');
          clonedButtons.forEach(button => {
            button.style.display = 'none';
          });
        }
      });

      // Создаем новый canvas для поворота изображения на 90° против часовой стрелки
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Ошибка создания контекста для поворота изображения');
      }

      // Устанавливаем размеры повернутого canvas
      // После поворота на 90° ширина и высота меняются местами
      const rotatedWidth = canvas.height;
      const rotatedHeight = canvas.width;
      
      rotatedCanvas.width = rotatedWidth;
      rotatedCanvas.height = rotatedHeight;
      
      console.log('Размеры после поворота:', { width: rotatedWidth, height: rotatedHeight });

      // Поворачиваем контекст на 90° против часовой стрелки
      ctx.translate(0, rotatedHeight);
      ctx.rotate(-Math.PI / 2);

      // Рисуем исходное изображение на повернутом canvas
      ctx.drawImage(canvas, 0, 0);

      // Конвертируем в ArrayBuffer
      return new Promise<ArrayBuffer>((resolve, reject) => {
        rotatedCanvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(reject);
          } else {
            reject(new Error('Ошибка создания изображения графика'));
          }
        }, 'image/png', 1.0);
      });

    } finally {
      // Восстанавливаем отображение кнопок
      buttons.forEach((button, index) => {
        button.style.display = originalDisplays[index] || '';
      });
    }
  }

  /**
   * Создание отчета на основе шаблона с PNG изображением
   */
  async processTemplate(
    templateFile: File,
    data: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      console.log('Создание отчета по шаблону с PNG изображением...');
      
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await templateFile.arrayBuffer();
      
      // Создаем скриншот графика
      console.log('Создаем скриншот графика...');
      const chartImageBuffer = await this.createRotatedScreenshot(chartElement);
      console.log('Скриншот создан, размер:', chartImageBuffer.byteLength, 'байт');

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateBuffer);

      // Читаем основной документ
      const documentXml = zip.files['word/document.xml'].asText();
      
      // Проверяем наличие плейсхолдера {chart}
      if (!documentXml.includes('{chart}')) {
        throw new Error('В шаблоне не найден плейсхолдер {chart}');
      }

      // Добавляем изображение в папку word/media
      const imageName = 'chart.png';
      const mediaPath = `word/media/${imageName}`;
      
      // Создаем папку media если её нет
      if (!zip.files['word/media/']) {
        zip.folder('word/media');
      }
      
      // Добавляем изображение
      zip.file(mediaPath, chartImageBuffer);
      console.log('Изображение добавлено в:', mediaPath);

      // Генерируем уникальный ID для связи
      const relationshipId = this.generateRelationshipId(zip);
      console.log('Сгенерирован ID связи:', relationshipId);

      // Обновляем файл связей
      this.updateRelationships(zip, relationshipId, `media/${imageName}`);

      // Заменяем плейсхолдер на XML изображения
      const updatedDocumentXml = this.replaceChartPlaceholder(documentXml, relationshipId);
      zip.file('word/document.xml', updatedDocumentXml);

      // Обрабатываем другие плейсхолдеры
      const finalDocumentXml = this.processTextPlaceholders(updatedDocumentXml, data);
      zip.file('word/document.xml', finalDocumentXml);

      // Генерируем итоговый DOCX файл
      console.log('Генерируем итоговый DOCX файл...');
      const buffer = zip.generate({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log('DOCX файл создан успешно, размер:', buffer.size, 'байт');
      
      return buffer;

    } catch (error) {
      console.error('Ошибка генерации отчета по шаблону:', error);
      
      // Детальная информация об ошибке
      if (error instanceof Error) {
        console.error('Детали ошибки:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      throw new Error(`Не удалось создать отчет по шаблону: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Генерация уникального ID для связи
   */
  private generateRelationshipId(zip: PizZip): string {
    const relsPath = 'word/_rels/document.xml.rels';
    let maxId = 0;
    
    if (zip.files[relsPath]) {
      const relsXml = zip.files[relsPath].asText();
      const idMatches = relsXml.match(/Id="rId(\d+)"/g);
      
      if (idMatches) {
        idMatches.forEach(match => {
          const id = parseInt(match.match(/\d+/)?.[0] || '0');
          if (id > maxId) maxId = id;
        });
      }
    }
    
    return `rId${maxId + 1}`;
  }

  /**
   * Обновление файла связей
   */
  private updateRelationships(zip: PizZip, relationshipId: string, imagePath: string): void {
    const relsPath = 'word/_rels/document.xml.rels';
    let relsXml: string;
    
    if (zip.files[relsPath]) {
      relsXml = zip.files[relsPath].asText();
    } else {
      // Создаем базовый файл связей
      relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    }

    // Добавляем новую связь для изображения
    const imageRelationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${imagePath}"/>`;
    
    // Вставляем связь перед закрывающим тегом
    relsXml = relsXml.replace('</Relationships>', `  ${imageRelationship}\n</Relationships>`);
    
    zip.file(relsPath, relsXml);
    console.log('Обновлен файл связей:', relsPath);
  }

  /**
   * Замена плейсхолдера {chart} на XML изображения
   */
  private replaceChartPlaceholder(documentXml: string, relationshipId: string): string {
    // XML структура для вставки изображения
    const imageXml = `<w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="5715000" cy="7620000"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="1" name="Chart"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="1" name="Chart"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relationshipId}"/>
                    <a:stretch>
                      <a:fillRect/>
                    </a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="5715000" cy="7620000"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect">
                      <a:avLst/>
                    </a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`;

    // Заменяем плейсхолдер на XML изображения
    return documentXml.replace(/{chart}/g, imageXml);
  }

  /**
   * Обработка текстовых плейсхолдеров
   */
  private processTextPlaceholders(documentXml: string, data: TemplateReportData): string {
    let result = documentXml;

    // Основные данные
    result = result.replace(/{title}/g, this.escapeXml(data.title));
    result = result.replace(/{date}/g, this.escapeXml(data.date));
    result = result.replace(/{dataType}/g, this.escapeXml(data.dataType === 'temperature' ? 'Температура' : 'Влажность'));

    // Статистика датчиков
    result = result.replace(/{totalSensors}/g, data.analysisResults.length.toString());
    result = result.replace(/{internalSensors}/g, data.analysisResults.filter(r => !r.isExternal).length.toString());
    result = result.replace(/{externalSensors}/g, data.analysisResults.filter(r => r.isExternal).length.toString());
    result = result.replace(/{compliantSensors}/g, data.analysisResults.filter(r => r.meetsLimits === 'Да').length.toString());
    result = result.replace(/{nonCompliantSensors}/g, data.analysisResults.filter(r => r.meetsLimits === 'Нет').length.toString());

    return result;
  }

  /**
   * Экранирование XML символов
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Валидация DOCX шаблона
   */
  async validateTemplate(templateFile: File): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Проверяем расширение файла
      if (!templateFile.name.toLowerCase().endsWith('.docx')) {
        return {
          isValid: false,
          errors: ['Файл должен иметь расширение .docx']
        };
      }

      // Читаем файл как ArrayBuffer
      const buffer = await templateFile.arrayBuffer();
      
      // Проверяем, что это валидный ZIP архив (DOCX)
      try {
        const zip = new PizZip(buffer);
        
        // Проверяем наличие основных файлов DOCX
        if (!zip.files['word/document.xml']) {
          return {
            isValid: false,
            errors: ['Файл не является корректным DOCX документом']
          };
        }

        // Читаем содержимое документа
        const documentXml = zip.files['word/document.xml'].asText();
        
        // Проверяем наличие плейсхолдера {chart}
        if (!documentXml.includes('{chart}')) {
          return {
            isValid: false,
            errors: ['В шаблоне не найден плейсхолдер {chart} для вставки изображения графика']
          };
        }

        return {
          isValid: true,
          errors: []
        };

      } catch (zipError) {
        return {
          isValid: false,
          errors: ['Не удалось прочитать DOCX файл. Возможно, файл поврежден.']
        };
      }

    } catch (error) {
      console.error('Ошибка валидации шаблона:', error);
      return {
        isValid: false,
        errors: ['Ошибка при проверке файла шаблона']
      };
    }
  }
}