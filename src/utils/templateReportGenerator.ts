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
      
      // Подготавливаем данные для замены плейсхолдеров
      const templateData = {
        chart: {
          _type: 'image',
          source: chartImageBase64,
          format: 'png',
          width: 6,
          height: 4
        },
        'results table': String(this.formatResultsTable(data.analysisResults)),
        executor: String(data.executor),
        'report date': String(data.reportDate)
      };

      console.log('Данные для шаблона подготовлены:', Object.keys(templateData));

      // Генерируем отчет с помощью docx-templates
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        additionalJsContext: {
          // Дополнительные функции для обработки данных в шаблоне
          formatNumber: (num: number) => num.toFixed(1),
          formatDate: (date: string) => new Date(date).toLocaleDateString('ru-RU')
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
        // Убираем префикс data:image/png;base64,
        const parts = result.split(',');
        const base64 = parts.length > 1 ? parts[1] : '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private formatResultsTable(results: any[]): string {
    if (!results || results.length === 0) {
      return 'Нет данных для отображения';
    }

    // Создаем простую текстовую таблицу
    let tableText = '№ зоны\tУровень (м.)\tЛоггер\tS/N\tМин.t°C\tМакс.t°C\tСреднее t°C\tСоответствие\n';

    results.forEach(result => {
      tableText += `${result.zoneNumber}\t${result.measurementLevel}\t${result.loggerName}\t${result.serialNumber}\t${result.minTemp}\t${result.maxTemp}\t${result.avgTemp}\t${result.meetsLimits}\n`;
    });

    return tableText;
  }

  private escapeHtml(text: string | number): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}