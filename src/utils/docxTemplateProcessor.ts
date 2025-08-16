import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel } from 'docx';
import html2canvas from 'html2canvas';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module';
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
   * Обработка DOCX шаблона с заменой плейсхолдера {chart} на изображение
   */
  async processTemplate(
    templateFile: File,
    data: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      console.log('Начинаем обработку DOCX шаблона...');
      
      // Читаем файл шаблона
      const templateArrayBuffer = await templateFile.arrayBuffer();
      const zip = new PizZip(templateArrayBuffer);

      // Создаем скриншот графика
      console.log('Создаем скриншот графика...');
      const chartImageBuffer = await this.createRotatedScreenshot(chartElement);
      console.log('Скриншот создан, размер:', chartImageBuffer.byteLength, 'байт');

      // Настраиваем модуль для работы с изображениями
      const imageModule = new ImageModule({
        centered: true,
        getImage: (tagValue: string, tagName: string) => {
          console.log('Запрос изображения для тега:', tagName, 'значение:', tagValue);
          
          if (tagName === 'chart') {
            return chartImageBuffer;
          }
          
          throw new Error(`Неизвестный тег изображения: ${tagName}`);
        },
        getSize: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log('Запрос размеров для тега:', tagName);
          
          if (tagName === 'chart') {
            // Возвращаем размеры для отображения в документе
            // Размеры в пикселях, которые будут преобразованы в EMU (English Metric Units)
            const elementRect = chartElement.getBoundingClientRect();
            
            // После поворота на 90° меняем местами ширину и высоту
            const displayWidth = Math.min(600, elementRect.height * 0.8); // Ограничиваем ширину
            const displayHeight = Math.min(800, elementRect.width * 0.8); // Ограничиваем высоту
            
            return [displayWidth, displayHeight];
          }
          
          return [400, 300]; // Размеры по умолчанию
        }
      });

      // Создаем экземпляр docxtemplater с модулем изображений
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });

      // Подготавливаем данные для замены
      const templateData = {
        // Основные данные
        title: data.title,
        date: data.date,
        dataType: data.dataType === 'temperature' ? 'Температура' : 'Влажность',
        
        // Изображение графика
        chart: chartImageBuffer, // Передаем ArrayBuffer напрямую
        
        // Статистические данные
        totalSensors: data.analysisResults.length,
        internalSensors: data.analysisResults.filter(r => !r.isExternal).length,
        externalSensors: data.analysisResults.filter(r => r.isExternal).length,
        
        // Температурная статистика (если применимо)
        ...(data.dataType === 'temperature' && data.analysisResults.length > 0 ? {
          hasTemperatureStats: true,
          minAvgTemp: Math.min(...data.analysisResults
            .filter(r => !r.isExternal && !isNaN(parseFloat(r.avgTemp)))
            .map(r => parseFloat(r.avgTemp))
          ).toFixed(1),
          maxAvgTemp: Math.max(...data.analysisResults
            .filter(r => !r.isExternal && !isNaN(parseFloat(r.avgTemp)))
            .map(r => parseFloat(r.avgTemp))
          ).toFixed(1),
          overallAvgTemp: (data.analysisResults
            .filter(r => !r.isExternal && !isNaN(parseFloat(r.avgTemp)))
            .map(r => parseFloat(r.avgTemp))
            .reduce((sum, temp) => sum + temp, 0) / 
            data.analysisResults.filter(r => !r.isExternal && !isNaN(parseFloat(r.avgTemp))).length
          ).toFixed(1)
        } : { hasTemperatureStats: false }),
        
        // Соответствие лимитам
        compliantSensors: data.analysisResults.filter(r => r.meetsLimits === 'Да').length,
        nonCompliantSensors: data.analysisResults.filter(r => r.meetsLimits === 'Нет').length,
        
        // Список результатов для таблиц
        results: data.analysisResults.map(result => ({
          zoneNumber: result.zoneNumber,
          measurementLevel: result.measurementLevel,
          loggerName: result.loggerName,
          serialNumber: result.serialNumber,
          minTemp: result.minTemp,
          maxTemp: result.maxTemp,
          avgTemp: result.avgTemp,
          minHumidity: result.minHumidity,
          maxHumidity: result.maxHumidity,
          avgHumidity: result.avgHumidity,
          meetsLimits: result.meetsLimits,
          isExternal: result.isExternal
        }))
      };

      console.log('Данные для шаблона:', templateData);

      // Заполняем шаблон данными
      doc.render(templateData);

      // Генерируем итоговый документ
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      console.log('DOCX документ с изображением создан успешно');
      return output;

    } catch (error) {
      console.error('Ошибка обработки DOCX шаблона:', error);
      
      // Если ошибка связана с шаблоном, предоставляем подробную информацию
      if (error instanceof Error) {
        if (error.message.includes('Multi error')) {
          throw new Error('Ошибка в шаблоне DOCX. Проверьте правильность плейсхолдеров и структуру документа.');
        } else if (error.message.includes('chart')) {
          throw new Error('Ошибка вставки изображения графика. Убедитесь, что в шаблоне используется плейсхолдер {chart}.');
        }
      }
      
      throw new Error(`Не удалось обработать шаблон: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Валидация DOCX шаблона
   */
  async validateTemplate(templateFile: File): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const templateArrayBuffer = await templateFile.arrayBuffer();
      const zip = new PizZip(templateArrayBuffer);
      
      // Проверяем, что это валидный DOCX файл
      if (!zip.files['word/document.xml']) {
        return {
          isValid: false,
          errors: ['Файл не является валидным DOCX документом']
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

    } catch (error) {
      return {
        isValid: false,
        errors: [`Ошибка чтения шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`]
      };
    }
  }
}