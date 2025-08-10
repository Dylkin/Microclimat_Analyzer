import { createReport } from 'docx-templates';
import { convertHtmlTableToDocx } from './htmlTableToDocx';

export interface TemplateReportData {
  chartImageBlob: Blob;
  executor: string;
  reportDate: string;
  reportNumber: string;
  reportStart: string;
  dataType: 'temperature' | 'humidity';
  acceptanceCriteria: string;
  testType: string;
  objectName: string;
  coolingSystemName: string;
  resultsTableHtml?: string;
}

export class TemplateReportGenerator {
  private static instance: TemplateReportGenerator;

  static getInstance(): TemplateReportGenerator {
    if (!TemplateReportGenerator.instance) {
      TemplateReportGenerator.instance = new TemplateReportGenerator();
    }
    return TemplateReportGenerator.instance;
  }

  async generateReportFromTemplate(templateFile: File, data: TemplateReportData): Promise<Blob> {
    try {
      console.log('=== Начало генерации отчета из шаблона ===');
      console.log('Имя файла шаблона:', templateFile.name);
      console.log('Размер файла шаблона:', templateFile.size, 'байт');
      
      // Используем только docx-templates для полной поддержки HTML таблиц
      return await this.generateWithDocxTemplates(templateFile, data);
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw error;
    }
  }

  /**
   * Генерация отчета с помощью docx-templates (поддерживает HTML таблицы)
   */
  private async generateWithDocxTemplates(templateFile: File, data: TemplateReportData): Promise<Blob> {
    console.log('Используем docx-templates для генерации отчета');
    
    // Конвертируем изображение в base64
    const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
    const chartImageBase64 = this.arrayBufferToBase64(chartImageBuffer);
    
    // Конвертируем HTML таблицу в DOCX формат если она есть
    let resultsTable = null;
    if (data.resultsTableHtml) {
      try {
        console.log('Конвертируем HTML таблицу в DOCX формат...');
        
        // Создаем временный DOM элемент для парсинга HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.resultsTableHtml;
        const tableElement = tempDiv.querySelector('table') as HTMLTableElement;
        
        if (tableElement) {
          resultsTable = await convertHtmlTableToDocx(tableElement, {
            keepFontStyles: true,
            defaultColWidth: 1500,
            processCellContent: (cell) => cell.textContent?.trim() || ''
          });
          console.log('HTML таблица успешно конвертирована в DOCX');
        } else {
          console.warn('Таблица не найдена в HTML');
        }
      } catch (error) {
        console.error('Ошибка конвертации HTML таблицы:', error);
        // Продолжаем без таблицы
      }
    }
    
    // Подготавливаем данные для docx-templates
    const templateData = {
      executor: data.executor,
      Report_No: data.reportNumber,
      Report_start: data.reportStart,
      report_date: data.reportDate,
      chart_image: {
        width: 15, // cm
        height: 10, // cm
        data: chartImageBase64,
        extension: '.png'
      },
      Acceptance_criteria: data.acceptanceCriteria,
      TestType: data.testType || 'Не выбрано',
      AcceptanceСriteria: data.acceptanceCriteria,
      ObjectName: data.objectName,
      CoolingSystemName: data.coolingSystemName,
      ResultsTable: resultsTable
    };

    // Читаем шаблон
    const templateBuffer = await templateFile.arrayBuffer();
    
    // Генерируем отчет
    const reportBuffer = await createReport({
      template: templateBuffer,
      data: templateData,
      additionalJsContext: {
        // Дополнительные функции для обработки данных
        formatNumber: (num: number) => num.toFixed(1),
        isExternal: (zoneNumber: number) => zoneNumber === 999
      }
    });
    
    return new Blob([reportBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }









  /**
   * Конвертирует ArrayBuffer в base64 строку
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Очищаем URL через некоторое время
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
}