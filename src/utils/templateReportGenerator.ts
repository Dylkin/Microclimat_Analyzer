import { createReport } from 'docx-templates';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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
   * Генерация отчета с помощью docxtemplater
   */
  private async generateWithDocxTemplates(templateFile: File, data: TemplateReportData): Promise<Blob> {
    // Создаем простую текстовую таблицу для вставки в шаблон
    
    // Конвертируем изображение в base64 для docxtemplater
    const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
    const chartImageBase64 = btoa(String.fromCharCode(...new Uint8Array(chartImageBuffer)));
    
    // Подготавливаем данные для docxtemplater (все значения должны быть строками)
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
      ResultsTable: String(''),
    };

    // Читаем шаблон
    const templateBuffer = await templateFile.arrayBuffer();
    
    // Генерируем отчет
    try {
      // 1. Загрузка шаблона с правильной кодировкой
      const templateBuffer = await templateFile.arrayBuffer();
      const content = new Uint8Array(templateBuffer);
      const zip = new PizZip(content);

      // 2. Инициализация docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 3. Рендер документа с подготовленными данными
      doc.render(templateData);

      // 4. Генерация файла
      const out = doc.getZip().generate({ 
        type: "blob",
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      return out;
    } catch (error) {
      console.error("Ошибка генерации документа:", error);
      
      // Добавляем дополнительную обработку ошибок
      if (error instanceof Error && error.message.includes("charCodeAt")) {
        console.warn("Проверьте, что все передаваемые данные являются строками");
        throw new Error("Ошибка обработки данных шаблона. Убедитесь, что все поля заполнены корректно.");
      }
      
      throw error;
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