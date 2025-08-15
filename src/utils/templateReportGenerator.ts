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
      
      // Используем docx-templates для генерации отчета
      return await this.generateWithDocxTemplates(templateFile, data);
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw error;
    }
  }

  /**
   * Генерация отчета с помощью docx-templates
   */
  private async generateWithDocxTemplates(templateFile: File, data: TemplateReportData): Promise<Blob> {
    console.log('Используем docx-templates для генерации отчета...');
    
    // Подготавливаем данные для docx-templates
    const templateData = {
      executor: data.executor,
      Report_No: data.reportNumber,
      Report_start: data.reportStart,
      report_date: data.reportDate,
      chart_image: data.chartImageBlob, // Передаем Blob напрямую
      AcceptanceСriteria: data.acceptanceCriteria,
      TestType: data.testType || 'Не выбрано',
      ObjectName: data.objectName,
      CoolingSystemName: data.coolingSystemName,
    };

    console.log('Данные для шаблона подготовлены');

    // Читаем шаблон как ArrayBuffer
    const templateBuffer = await templateFile.arrayBuffer();
    
    // Генерируем отчет с помощью docx-templates
    try {
      console.log('Запускаем createReport...');
      
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        additionalJsContext: {
          // Дополнительные функции для обработки данных
        },
        cmdDelimiter: ['{', '}'], // Используем стандартные разделители
        processLineBreaks: true,
        noSandBox: false
      });
      
      console.log('Отчет успешно сгенерирован');
      return new Blob([reportBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
    } catch (error) {
      console.error('Ошибка генерации документа:', error);
      
      if (error instanceof Error) {
        throw new Error(`Ошибка создания отчета: ${error.message}`);
      } else {
        throw new Error('Неизвестная ошибка при создании отчета');
      }
    }
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