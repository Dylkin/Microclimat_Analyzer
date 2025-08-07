import createReport from 'docx-templates';
import { saveAs } from 'file-saver';

// Полифилл для vm модуля в браузере
if (typeof window !== 'undefined' && !window.vm) {
  window.vm = {
    Script: class {
      constructor(code) {
        this.code = code;
      }
      runInNewContext(context) {
        const func = new Function(...Object.keys(context), `return ${this.code}`);
        return func(...Object.values(context));
      }
    }
  };
}

export interface ReportData {
  // Основная информация
  reportNo: string;
  reportDate: string;
  nameOfObject: string;
  nameOfAirConditioningSystem: string;
  nameOfTest: string;
  
  // Временные данные
  dateTimeOfTestStart: string;
  dateTimeOfTestCompletion: string;
  durationOfTest: string;
  
  // Критерии и результаты
  acceptanceCriteria: string;
  resultsTable: Array<{
    zoneNumber: string;
    measurementLevel: string;
    loggerName: string;
    serialNumber: string;
    minTemp: string;
    maxTemp: string;
    avgTemp: string;
    meetsLimits: string;
  }>;
  result: string;
  
  // Исполнители
  executor: string;
  director: string;
  testDate: string;
  
  // График
  chartImagePath?: string;
}

export class ReportGenerator {
  /**
   * Создание изображения графика из SVG элемента
   */
  private static async createChartImage(svgElement: SVGSVGElement): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      try {
        // Создаем canvas для рендеринга SVG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Не удалось создать контекст canvas');
        }

        // Получаем размеры SVG
        const svgRect = svgElement.getBoundingClientRect();
        const originalWidth = svgRect.width || 1200;
        const originalHeight = svgRect.height || 400;
        
        canvas.width = originalWidth;
        canvas.height = originalHeight;

        // Создаем изображение из SVG
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = async () => {
          try {
            // Рисуем изображение на canvas
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Создаем новый canvas для поворота на 90° против часовой стрелки
            const rotatedCanvas = document.createElement('canvas');
            const rotatedCtx = rotatedCanvas.getContext('2d');
            
            if (!rotatedCtx) {
              URL.revokeObjectURL(url);
              reject(new Error('Не удалось создать контекст для поворота'));
              return;
            }
            
            // Меняем размеры местами для поворота
            rotatedCanvas.width = originalHeight;
            rotatedCanvas.height = originalWidth;
            
            // Применяем трансформации для поворота на 90° против часовой стрелки
            rotatedCtx.translate(0, originalWidth);
            rotatedCtx.rotate(-Math.PI / 2);
            
            // Рисуем оригинальное изображение на повернутый canvas
            rotatedCtx.drawImage(canvas, 0, 0);

            // Конвертируем повернутый canvas в Uint8Array
            rotatedCanvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Не удалось создать blob из повернутого canvas'));
                return;
              }

              try {
                // Читаем blob как ArrayBuffer
                const arrayBuffer = await blob.arrayBuffer();
                
                // Конвертируем в Uint8Array
                const uint8Array = new Uint8Array(arrayBuffer);
                
                URL.revokeObjectURL(url);
                resolve(uint8Array);
              } catch (error) {
                URL.revokeObjectURL(url);
                reject(error);
              }
            }, 'image/png');
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Не удалось загрузить SVG изображение'));
        };

        img.src = url;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Генерация отчета на основе шаблона
   */
  static async generateReport(
    templateFile: File,
    reportData: ReportData,
    chartSvg?: SVGSVGElement
  ): Promise<void> {
    try {
      console.log('Начинаем генерацию отчета...');

      // Читаем шаблон
      const templateBuffer = await templateFile.arrayBuffer();
      console.log('Шаблон загружен, размер:', templateBuffer.byteLength, 'байт');

      // Создаем изображение графика если передан SVG
      let chartImageBuffer: Uint8Array | undefined;
      if (chartSvg) {
        console.log('Создаем изображение графика...');
        chartImageBuffer = await this.createChartImage(chartSvg);
        console.log('Изображение графика создано, размер:', chartImageBuffer.length, 'байт');
      }

      // Подготавливаем данные для шаблона
      const templateData = {
        // Основная информация
        reportNo: reportData.reportNo,
        reportDate: reportData.reportDate,
        nameOfObject: reportData.nameOfObject,
        nameOfAirConditioningSystem: reportData.nameOfAirConditioningSystem,
        nameOfTest: reportData.nameOfTest,
        
        // Временные данные
        dateTimeOfTestStart: reportData.dateTimeOfTestStart,
        dateTimeOfTestCompletion: reportData.dateTimeOfTestCompletion,
        durationOfTest: reportData.durationOfTest,
        
        // Критерии и результаты
        acceptanceCriteria: reportData.acceptanceCriteria,
        resultsTable: reportData.resultsTable,
        result: reportData.result,
        
        // Исполнители
        executor: reportData.executor,
        director: reportData.director,
        testDate: reportData.testDate,
        
        // График (если есть)
        ...(chartImageBuffer && {
          chart: {
            width: 15, // ширина в см (после поворота)
            height: 10, // высота в см (после поворота)
            data: chartImageBuffer,
            extension: '.png'
          }
        })
      };

      console.log('Данные для шаблона подготовлены');

      // Дополнительный JavaScript контекст для обработки изображений
      const additionalJsContext = {
        // Функция для вставки изображения
        img: (data: any, options: any = {}) => {
          if (data && data.data) {
            return {
              width: options.width || data.width || 10,
              height: options.height || data.height || 8,
              data: data.data,
              extension: data.extension || '.png'
            };
          }
          return null;
        }
      };

      console.log('Генерируем документ...');

      // Генерируем отчет
      const buffer = await createReport({
        template: templateBuffer,
        data: templateData,
        additionalJsContext,
        cmdDelimiter: ['{', '}'], // Используем синтаксис {...} для плейсхолдеров
        literalXmlDelimiter: ['{{', '}}'], // Для XML вставок
        processLineBreaks: true,
        noSandBox: false
      });

      console.log('Документ сгенерирован, размер:', buffer.length, 'байт');

      // Сохраняем файл
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const fileName = `Отчет_${reportData.reportNo}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);

      console.log('Отчет успешно сохранен:', fileName);

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      
      // Проверяем, является ли это ошибкой синтаксиса плейсхолдера
      if (error instanceof Error && error.message.includes('SyntaxError: Unexpected token')) {
        const match = error.message.match(/Error executing command '([^']+)'/);
        const invalidPlaceholder = match ? match[1] : 'неизвестный плейсхолдер';
        
        throw new Error(
          `Ошибка в шаблоне: плейсхолдер "{${invalidPlaceholder}}" содержит недопустимые символы.\n\n` +
          `Плейсхолдеры должны использовать camelCase без пробелов и специальных символов.\n` +
          `Например: "{nameOfObject}" вместо "{name of the object}".\n\n` +
          `Откройте ваш DOCX шаблон и исправьте все плейсхолдеры согласно документации.`
        );
      }
      
      throw new Error(`Не удалось сгенерировать отчет: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Проверка корректности шаблона
   */
  static async validateTemplate(templateFile: File): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Проверяем расширение файла
      if (!templateFile.name.toLowerCase().endsWith('.docx')) {
        errors.push('Файл должен иметь расширение .docx');
      }

      // Проверяем размер файла (не более 50MB)
      if (templateFile.size > 50 * 1024 * 1024) {
        errors.push('Размер файла не должен превышать 50MB');
      }

      // Проверяем, что файл не пустой
      if (templateFile.size === 0) {
        errors.push('Файл не должен быть пустым');
      }

      // Дополнительные проверки можно добавить здесь
      // Например, проверка наличия обязательных плейсхолдеров

    } catch (error) {
      errors.push('Ошибка при проверке файла шаблона');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Получение списка доступных плейсхолдеров
   */
  static getAvailablePlaceholders(): { [category: string]: string[] } {
    return {
      'Основная информация': [
        '{reportNo} - Номер отчета',
        '{reportDate} - Дата отчета',
        '{nameOfObject} - Название объекта исследования',
        '{nameOfAirConditioningSystem} - Название климатической установки',
        '{nameOfTest} - Вид испытания'
      ],
      'Временные данные': [
        '{dateTimeOfTestStart} - Дата и время начала испытания',
        '{dateTimeOfTestCompletion} - Дата и время завершения испытания',
        '{durationOfTest} - Длительность испытания'
      ],
      'Критерии и результаты': [
        '{acceptanceCriteria} - Критерии приемки',
        '{resultsTable} - Таблица результатов',
        '{result} - Выводы и заключение'
      ],
      'Исполнители': [
        '{executor} - Исполнитель',
        '{director} - Руководитель',
        '{testDate} - Дата проведения испытания'
      ],
      'График': [
        '{chart} - Место для вставки повернутого графика'
      ]
    };
  }
}