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
    RESULTS_TABLE: '{results_table}',
    EXECUTOR: '{executor}',
    REPORT_DATE: '{report_date}'
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
      
      // Создаем PNG файл из blob
      const pngFileName = await this.createPngFile(data.chartImageBlob, data.dataType);
      
      // Подготавливаем данные для замены плейсхолдеров
      const templateData = {
        'results_table': this.formatResultsTable(data.analysisResults),
        executor: String(data.executor),
        'report_date': String(data.reportDate)
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

  /**
   * Создание PNG файла из blob изображения
   */
  private async createPngFile(chartBlob: Blob, dataType: 'temperature' | 'humidity'): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
    
    const fileName = `график_${dataTypeLabel}_${dateStr}_${timeStr}.png`;
    
    // Создаем ссылку для скачивания PNG файла
    const pngUrl = URL.createObjectURL(chartBlob);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Очищаем URL через некоторое время
    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    
    return fileName;
  }

  /**
   * Встраивание PNG файла в структуру DOCX
   */
  private async embedPngInDocx(docxBuffer: ArrayBuffer, pngBlob: Blob, pngFileName: string): Promise<ArrayBuffer> {
    try {
      // Импортируем JSZip динамически
      const JSZip = (await import('jszip')).default;
      
      // Загружаем DOCX как ZIP архив
      const zip = await JSZip.loadAsync(docxBuffer);
      
      // Конвертируем PNG blob в ArrayBuffer
      const pngArrayBuffer = await pngBlob.arrayBuffer();
      
      // Добавляем PNG файл в папку word/media
      zip.file(`word/media/${pngFileName}`, pngArrayBuffer);
      
      // Генерируем обновленный DOCX
      const updatedDocxBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      console.log(`PNG файл ${pngFileName} успешно встроен в DOCX`);
      return updatedDocxBuffer;
      
    } catch (error) {
      console.error('Ошибка встраивания PNG в DOCX:', error);
      // Если встраивание не удалось, возвращаем исходный буфер
      return docxBuffer;
    }
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}