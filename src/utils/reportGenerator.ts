import createReport from 'docx-templates';
import sharp from 'sharp';
import { saveAs } from 'file-saver';

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
   * Поворот изображения на 90 градусов против часовой стрелки
   */
  private static async rotateImage(imageBuffer: ArrayBuffer): Promise<Buffer> {
    try {
      const rotatedBuffer = await sharp(Buffer.from(imageBuffer))
        .rotate(-90) // Поворот на 90 градусов против часовой стрелки
        .png()
        .toBuffer();
      
      return rotatedBuffer;
    } catch (error) {
      console.error('Ошибка поворота изображения:', error);
      throw new Error('Не удалось повернуть изображение');
    }
  }

  /**
   * Создание изображения графика из SVG элемента
   */
  private static async createChartImage(svgElement: SVGSVGElement): Promise<Buffer> {
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
        canvas.width = svgRect.width || 1200;
        canvas.height = svgRect.height || 400;

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

            // Конвертируем canvas в blob
            canvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Не удалось создать blob из canvas'));
                return;
              }

              try {
                // Читаем blob как ArrayBuffer
                const arrayBuffer = await blob.arrayBuffer();
                
                // Поворачиваем изображение на 90 градусов против часовой стрелки
                const rotatedBuffer = await this.rotateImage(arrayBuffer);
                
                URL.revokeObjectURL(url);
                resolve(rotatedBuffer);
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
      let chartImageBuffer: Buffer | undefined;
      if (chartSvg) {
        console.log('Создаем изображение графика...');
        chartImageBuffer = await this.createChartImage(chartSvg);
        console.log('Изображение графика создано, размер:', chartImageBuffer.length, 'байт');
      }

      // Подготавливаем данные для шаблона
      const templateData = {
        // Основная информация
        'Report No.': reportData.reportNo,
        'Report date': reportData.reportDate,
        'name of the object': reportData.nameOfObject,
        'name of the air conditioning system': reportData.nameOfAirConditioningSystem,
        'name of the test': reportData.nameOfTest,
        
        // Временные данные
        'Date time of test start': reportData.dateTimeOfTestStart,
        'Date time of test completion': reportData.dateTimeOfTestCompletion,
        'Duration of the test': reportData.durationOfTest,
        
        // Критерии и результаты
        'acceptance criteria': reportData.acceptanceCriteria,
        'Results table': reportData.resultsTable,
        'Result': reportData.result,
        
        // Исполнители
        'executor': reportData.executor,
        'director': reportData.director,
        'test date': reportData.testDate,
        
        // График (если есть)
        ...(chartImageBuffer && {
          'chart': {
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
        '{Report No.} - Номер отчета',
        '{Report date} - Дата отчета',
        '{name of the object} - Название объекта исследования',
        '{name of the air conditioning system} - Название климатической установки',
        '{name of the test} - Вид испытания'
      ],
      'Временные данные': [
        '{Date time of test start} - Дата и время начала испытания',
        '{Date time of test completion} - Дата и время завершения испытания',
        '{Duration of the test} - Длительность испытания'
      ],
      'Критерии и результаты': [
        '{acceptance criteria} - Критерии приемки',
        '{Results table} - Таблица результатов',
        '{Result} - Выводы и заключение'
      ],
      'Исполнители': [
        '{executor} - Исполнитель',
        '{director} - Руководитель',
        '{test date} - Дата проведения испытания'
      ],
      'График': [
        '{chart} - Место для вставки повернутого графика'
      ]
    };
  }
}