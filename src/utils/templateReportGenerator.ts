import { createReport } from 'docx-templates';

export interface TemplateReportData {
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
    
    // Подготавливаем данные для docxtemplater (все значения должны быть строками)
    const templateData = {
      executor: data.executor,
      Report_No: data.reportNumber,
      Report_start: data.reportStart,
      report_date: data.reportDate,
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

}