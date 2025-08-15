import { createReport } from 'docx-templates';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
const ImageModule = require('docxtemplater-image-module-free');

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
    // Конвертируем изображение в ArrayBuffer для модуля изображений
    const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
    
    // Подготавливаем данные для docxtemplater
    const templateData = {
      executor: data.executor,
      Report_No: data.reportNumber,
      Report_start: data.reportStart,
      report_date: data.reportDate,
      chart_image: chartImageBuffer,
      Acceptance_criteria: data.acceptanceCriteria,
      TestType: data.testType || 'Не выбрано',
      AcceptanceСriteria: data.acceptanceCriteria,
      ObjectName: data.objectName,
      CoolingSystemName: data.coolingSystemName,
    };

    // Читаем шаблон
    const templateBuffer = await templateFile.arrayBuffer();
    
    // Генерируем отчет
    try {
      // 1. Загрузка шаблона с правильной кодировкой
      const templateBuffer = await templateFile.arrayBuffer();
      const content = new Uint8Array(templateBuffer);
      const zip = new PizZip(content);

      // 2. Настройка модуля изображений
      const imageModule = new ImageModule({
        centered: false,
        getImage: function(tagValue: any, tagName: string) {
          console.log('getImage вызван для тега:', tagName, 'тип значения:', typeof tagValue);
          if (tagValue instanceof ArrayBuffer) {
            return tagValue;
          }
          if (tagValue instanceof Uint8Array) {
            return tagValue.buffer;
          }
          console.error('Неподдерживаемый тип данных изображения:', typeof tagValue);
          return tagValue;
        },
        getSize: function(img: any, tagValue: any, tagName: string) {
          console.log('getSize вызван для тега:', tagName);
          return [400, 300]; // ширина, высота в пикселях  
        }
      });

      // 3. Инициализация docxtemplater с модулем изображений
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        nullGetter: function(part: any) {
          console.log('nullGetter вызван для:', part);
          if (part.module === 'docxtemplater-image-module-free') {
            return '';
          }
          return '';
        }
      });

      // 4. Рендер документа с подготовленными данными
      console.log('Данные для рендера:', Object.keys(templateData));
      console.log('Тип chart_image:', typeof templateData.chart_image);
      doc.render(templateData);

      // 5. Генерация файла
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