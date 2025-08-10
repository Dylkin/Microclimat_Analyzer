import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import html2canvas from 'html2canvas';

export interface TemplateReportData {
  chartImageBlob: Blob;
  resultsTableElement?: HTMLElement;
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
      
      // Читаем шаблон как ArrayBuffer
      const templateArrayBuffer = await templateFile.arrayBuffer();
      console.log('Шаблон успешно прочитан как ArrayBuffer');
      
      // Конвертируем изображение в ArrayBuffer
      const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
      console.log('Изображение конвертировано в ArrayBuffer, размер:', chartImageBuffer.byteLength, 'байт');
      
      // Создаем изображение таблицы результатов если элемент предоставлен
      let resultsTableBuffer: ArrayBuffer | undefined;
      if (data.resultsTableElement) {
        console.log('Создаем изображение таблицы результатов...');
        resultsTableBuffer = await this.createTableImage(data.resultsTableElement);
        console.log('Изображение таблицы создано, размер:', resultsTableBuffer.byteLength, 'байт');
      }
      
      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        Report_No: data.reportNumber,
        Report_start: data.reportStart,
        report_date: data.reportDate,
        chart: chartImageBuffer,
        Acceptance_criteria: data.acceptanceCriteria,
        TestType: data.testType || 'Не выбрано',
        AcceptanceСriteria: data.acceptanceCriteria, // Русская С в AcceptanceСriteria
        ObjectName: data.objectName,
        CoolingSystemName: data.coolingSystemName,
        ResultsTable: resultsTableBuffer,
      };

      console.log('=== Данные для шаблона ===');
      console.log('executor:', data.executor);
      console.log('Report_No:', data.reportNumber);
      console.log('Report_start:', data.reportStart);
      console.log('report_date:', data.reportDate);
      console.log('chart_image_size:', `${chartImageBuffer.byteLength} байт`);
      console.log('TestType:', data.testType);
      console.log('ObjectName:', data.objectName);
      console.log('CoolingSystemName:', data.coolingSystemName);
      console.log('ResultsTable_size:', resultsTableBuffer ? `${resultsTableBuffer.byteLength} байт` : 'не предоставлена');

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateArrayBuffer);

      // Создаем модуль для работы с изображениями
      const imageModule = new ImageModule({
        centered: false,
        getImage: function(tagValue: any) {
          return tagValue;
        },
        getSize: function(img: ArrayBuffer, tagValue: any, tagName: string) {
          // Размеры для таблицы результатов
          if (tagName === 'ResultsTable') {
            return [600, 400]; // ширина, высота в пикселях
          }
          // Размеры для графика
          return [800, 600];
        }
      });

      // Создаем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule]
      });

      // Устанавливаем данные
      doc.setData(templateData);

      try {
        // Рендерим документ
        doc.render();
      } catch (error) {
        console.error('Ошибка рендеринга документа:', error);
        throw new Error(`Ошибка заполнения шаблона: ${error}`);
      }

      // Генерируем итоговый документ
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      console.log('Отчет успешно сгенерирован');
      return output;
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw error;
    }
  }

  /**
   * Создает изображение таблицы для вставки в шаблон
   */
  private async createTableImage(tableElement: HTMLElement): Promise<ArrayBuffer> {
    try {
      console.log('Создаем изображение таблицы для шаблона...');
      
      const originalStyles = new Map<HTMLElement, string>();
      this.enhanceTableForExport(tableElement, originalStyles);
      
      const canvas = await html2canvas(tableElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tableElement.offsetWidth,
        height: tableElement.offsetHeight
      });
      
      this.restoreOriginalStyles(originalStyles);
      
      console.log('Изображение таблицы создано, размер:', canvas.width, 'x', canvas.height);
      
      // Конвертируем в blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer()
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error('Ошибка создания изображения таблицы'));
          }
        }, 'image/png', 1.0);
      });
      
    } catch (error) {
      console.error('Ошибка создания изображения таблицы:', error);
      throw new Error(`Ошибка создания изображения таблицы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Улучшает стили таблицы для экспорта
   */
  private enhanceTableForExport(element: HTMLElement, originalStyles: Map<HTMLElement, string>): void {
    // Сохраняем и улучшаем стили для всех ячеек таблицы
    const cells = element.querySelectorAll('td, th');
    cells.forEach(cell => {
      const htmlCell = cell as HTMLElement;
      originalStyles.set(htmlCell, htmlCell.style.cssText);
      
      // Увеличиваем размер шрифта
      htmlCell.style.fontSize = '12pt';
      htmlCell.style.lineHeight = '1.4';
      
      // Улучшаем отступы
      if (!htmlCell.style.padding) {
        htmlCell.style.padding = '8px';
      }
    });
    
    // Сохраняем и улучшаем стили основного элемента
    originalStyles.set(element, element.style.cssText);
    element.style.boxShadow = 'none';
    element.style.transform = 'none';
    element.style.borderRadius = '0';
  }

  /**
   * Восстанавливает оригинальные стили
   */
  private restoreOriginalStyles(originalStyles: Map<HTMLElement, string>): void {
    originalStyles.forEach((cssText, element) => {
      element.style.cssText = cssText;
    });
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