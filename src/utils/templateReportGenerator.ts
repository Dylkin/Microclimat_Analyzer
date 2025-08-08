import { saveAs } from 'file-saver';
import { createReport } from 'docx-templates';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
  executor: string;
  reportDate: string;
  dataType: 'temperature' | 'humidity';
}

export class TemplateReportGenerator {
  private static instance: TemplateReportGenerator;

  // Фиксированный список поддерживаемых плейсхолдеров
  private static readonly PLACEHOLDERS = {
    CHART: '{chart}',
    RESULTS_TABLE: '{results table}',
    EXECUTOR: '{executor}',
    REPORT_DATE: '{report date}'
  };

  static getInstance(): TemplateReportGenerator {
    if (!TemplateReportGenerator.instance) {
      TemplateReportGenerator.instance = new TemplateReportGenerator();
    }
    return TemplateReportGenerator.instance;
  }

  static getAvailablePlaceholders(): string[] {
    return Object.values(TemplateReportGenerator.PLACEHOLDERS);
  }

  async generateReportFromTemplate(templateFile: File, data: TemplateReportData): Promise<Blob> {
    try {
      console.log('Начинаем генерацию отчета из шаблона:', templateFile.name);
      
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await this.readFileAsArrayBuffer(templateFile);
      
      // Конвертируем изображение графика в base64
      const chartImageBase64 = await this.blobToBase64(data.chartImageBlob);
      
      // Строгая функция для преобразования в строку
      const ensureString = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number') {
          return value.toString();
        }
        if (typeof value === 'boolean') {
          return value.toString();
        }
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return '[Object]';
          }
        }
        if (typeof value === 'function') {
          return '[Function]';
        }
        return String(value);
      };

      // Подготавливаем данные для замены плейсхолдеров
      const templateData = {
        chart: {
          _type: 'image',
          source: chartImageBase64,
          format: 'png',
          width: 6,
          height: 4
        },
        'results table': ensureString(this.formatResultsTable(data.analysisResults)),
        executor: ensureString(data.executor),
        'report date': ensureString(data.reportDate)
      };

      console.log('Данные для шаблона подготовлены');
      console.log('Типы данных:', {
        chart: typeof templateData.chart,
        'results table': typeof templateData['results table'],
        executor: typeof templateData.executor,
        'report date': typeof templateData['report date']
      });

      // Генерируем отчет с помощью docx-templates
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        additionalJsContext: {
          // Безопасные функции для обработки данных в шаблоне
          formatNumber: (num: any): string => {
            try {
              const n = parseFloat(ensureString(num));
              return isNaN(n) ? '0.0' : n.toFixed(1);
            } catch {
              return '0.0';
            }
          },
          formatDate: (date: any): string => {
            try {
              const dateStr = ensureString(date);
              const parsedDate = new Date(dateStr);
              return isNaN(parsedDate.getTime()) ? dateStr : parsedDate.toLocaleDateString('ru-RU');
            } catch {
              return ensureString(date);
            }
          },
          safeString: ensureString,
          // Функция для безопасного получения значения
          getValue: (obj: any, key: string): string => {
            try {
              if (obj && typeof obj === 'object' && key in obj) {
                return ensureString(obj[key]);
              }
              return '';
            } catch {
              return '';
            }
          }
        },
        processLineBreaks: true,
        // Добавляем обработчик ошибок
        errorHandler: (error: any) => {
          console.error('Ошибка в шаблоне:', error);
          return '[Ошибка обработки]';
        }
      });

      console.log('Отчет успешно сгенерирован');
      return new Blob([reportBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error('Не удалось создать отчет из шаблона: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  }

  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && event.target.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error('Не удалось прочитать файл шаблона как ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла шаблона'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result;
          
          // Проверяем, что результат является строкой
          if (typeof result !== 'string') {
            reject(new Error('FileReader не вернул строку'));
            return;
          }
          
          // Проверяем формат data URL
          if (!result.startsWith('data:')) {
            reject(new Error('Некорректный формат data URL'));
            return;
          }
          
          // Разделяем по запятой
          const parts = result.split(',');
          if (parts.length !== 2) {
            reject(new Error('Некорректная структура data URL'));
            return;
          }
          
          const base64 = parts[1];
          
          // Проверяем, что base64 строка не пустая и содержит только допустимые символы
          if (!base64 || typeof base64 !== 'string') {
            reject(new Error('Пустая base64 строка'));
            return;
          }
          
          // Проверяем корректность base64
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          if (!base64Regex.test(base64)) {
            reject(new Error('Некорректные символы в base64 строке'));
            return;
          }
          
          resolve(base64);
        } catch (error) {
          reject(new Error('Ошибка обработки base64 данных: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка')));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения blob данных'));
      reader.readAsDataURL(blob);
    });
  }

  private formatResultsTable(results: any[]): string {
    if (!results || !Array.isArray(results) || results.length === 0) {
      return 'Нет данных для отображения';
    }

    // Безопасная функция для получения значения из объекта
    const safeValue = (obj: any, key: string): string => {
      try {
        if (!obj || typeof obj !== 'object') {
          return '-';
        }
        
        const value = obj[key];
        
        if (value === null || value === undefined) {
          return '-';
        }
        
        if (typeof value === 'string') {
          return value;
        }
        
        if (typeof value === 'number') {
          return value.toString();
        }
        
        if (typeof value === 'boolean') {
          return value.toString();
        }
        
        return String(value);
      } catch {
        return '-';
      }
    };

    // Создаем простую текстовую таблицу с табуляцией
    let tableText = '№ зоны\tУровень (м.)\tЛоггер\tS/N\tМин.t°C\tМакс.t°C\tСреднее t°C\tСоответствие\n';

    results.forEach(result => {
      try {
        const row = [
          safeValue(result, 'zoneNumber'),
          safeValue(result, 'measurementLevel'),
          safeValue(result, 'loggerName'),
          safeValue(result, 'serialNumber'),
          safeValue(result, 'minTemp'),
          safeValue(result, 'maxTemp'),
          safeValue(result, 'avgTemp'),
          safeValue(result, 'meetsLimits')
        ].join('\t');
        
        tableText += row + '\n';
      } catch (error) {
        console.warn('Ошибка обработки строки результата:', error);
        tableText += '-\t-\t-\t-\t-\t-\t-\t-\n';
      }
    });

    return tableText;
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    try {
      // Проверяем корректность параметров
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Некорректный blob для сохранения');
      }
      
      if (!filename || typeof filename !== 'string') {
        throw new Error('Некорректное имя файла');
      }
      
      saveAs(blob, filename);
    } catch (error) {
      console.error('Ошибка сохранения файла:', error);
      throw error;
    }
  }
}