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
      
      // Безопасная функция для преобразования в строку
      const safeString = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
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
        'results table': safeString(this.formatResultsTable(data.analysisResults)),
        executor: safeString(data.executor),
        'report date': safeString(data.reportDate)
      };

      console.log('Данные для шаблона подготовлены:', Object.keys(templateData));

      // Генерируем отчет с помощью docx-templates
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        additionalJsContext: {
          // Дополнительные функции для обработки данных в шаблоне
          formatNumber: (num: any) => {
            const n = parseFloat(num);
            return isNaN(n) ? '0.0' : n.toFixed(1);
          },
          formatDate: (date: any) => {
            try {
              return new Date(date).toLocaleDateString('ru-RU');
            } catch {
              return safeString(date);
            }
          },
          safeString: safeString
        },
        processLineBreaks: true
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
        if (event.target?.result) {
          resolve(event.target.result as ArrayBuffer);
        } else {
          reject(new Error('Не удалось прочитать файл шаблона'));
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
        const result = reader.result as string;
        try {
          // Убираем префикс data:image/png;base64,
          const parts = result.split(',');
          const base64 = parts.length > 1 ? parts[1] : '';
          
          // Проверяем, что base64 строка не пустая
          if (!base64 || typeof base64 !== 'string') {
            reject(new Error('Не удалось получить base64 данные изображения'));
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
    if (!results || results.length === 0) {
      return 'Нет данных для отображения';
    }

    // Безопасная функция для получения значения
    const safeValue = (obj: any, key: string): string => {
      const value = obj?.[key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      return String(value);
    };

    // Создаем простую текстовую таблицу
    let tableText = '№ зоны\tУровень (м.)\tЛоггер\tS/N\tМин.t°C\tМакс.t°C\tСреднее t°C\tСоответствие\n';

    results.forEach(result => {
      tableText += `${safeValue(result, 'zoneNumber')}\t${safeValue(result, 'measurementLevel')}\t${safeValue(result, 'loggerName')}\t${safeValue(result, 'serialNumber')}\t${safeValue(result, 'minTemp')}\t${safeValue(result, 'maxTemp')}\t${safeValue(result, 'avgTemp')}\t${safeValue(result, 'meetsLimits')}\n`;
    });

    return tableText;
  }


  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}