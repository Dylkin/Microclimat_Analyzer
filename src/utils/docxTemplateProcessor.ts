import html2canvas from 'html2canvas';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module';

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

      // Настройка модуля изображений
      const imageOpts = {
        getImage: (tagValue: any) => {
          // Возвращаем данные изображения
          return tagValue.data;
        },
        getSize: (img: any, tagValue: any) => {
          // Возвращаем размеры изображения [ширина, высота]
          return [tagValue.size.width, tagValue.size.height];
        }
      };

      // Создаем экземпляр Docxtemplater с модулем изображений
      const doc = new Docxtemplater(zip, {
        modules: [new ImageModule(imageOpts)],
        paragraphLoop: true,
        linebreaks: true
      });

      // Подготавливаем данные для шаблона
      const templateData = {
        // Основные данные
        title: data.title,
        date: data.date,
        dataType: data.dataType === 'temperature' ? 'Температура' : 'Влажность',
        
        // Изображение графика
        chart: {
          data: Buffer.from(chartImageBuffer),
          size: {
            width: Math.min(600, chartElement.getBoundingClientRect().height * 0.8),
            height: Math.min(800, chartElement.getBoundingClientRect().width * 0.8)
          },
          extension: '.png',
          path: 'word/media/chart.png' // Явное указание пути
        },

        // Статистика датчиков
        totalSensors: data.analysisResults.length,
        internalSensors: data.analysisResults.filter(r => !r.isExternal).length,
        externalSensors: data.analysisResults.filter(r => r.isExternal).length,
        compliantSensors: data.analysisResults.filter(r => r.meetsLimits === 'Да').length,
        nonCompliantSensors: data.analysisResults.filter(r => r.meetsLimits === 'Нет').length,

        // Массив результатов для таблиц
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

      // Рендерим документ с данными
      console.log('Обрабатываем шаблон с данными...');
      doc.render(templateData);

      // Генерируем итоговый DOCX файл
      console.log('Генерируем итоговый DOCX файл...');
      const buffer = doc.getZip().generate({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Конвертируем в Blob
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      console.log('DOCX файл создан успешно, размер:', blob.size, 'байт');
      
      return blob;

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