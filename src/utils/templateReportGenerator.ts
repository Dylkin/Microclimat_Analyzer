import { createReport } from 'docx-templates';

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
    
    // Конвертируем изображение в Uint8Array для docx-templates
    const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
    const chartImageData = new Uint8Array(chartImageBuffer);
    
    // Подготавливаем данные для docx-templates
    const templateData = {
      executor: data.executor,
      Report_No: data.reportNumber,
      Report_start: data.reportStart,
      report_date: data.reportDate,
      chart_image: {
        width: 15, // cm
        height: 10, // cm
        data: chartImageData,
        extension: '.png'
      },
      Acceptance_criteria: data.acceptanceCriteria,
      TestType: data.testType || 'Не выбрано',
      AcceptanceСriteria: data.acceptanceCriteria,
      ObjectName: data.objectName,
      CoolingSystemName: data.coolingSystemName,
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