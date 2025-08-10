import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import html2canvas from 'html2canvas';
import htmlToDocx from 'html-to-docx';

export interface TemplateReportData {
  chartImageBlob: Blob;
  resultsTableHtml?: string;
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
      
      // Подготавливаем HTML таблицы результатов если предоставлена
      let resultsTableHtml: string | undefined;
      if (data.resultsTableHtml) {
        console.log('Подготавливаем HTML таблицы результатов...');
        resultsTableHtml = data.resultsTableHtml;
        console.log('HTML таблицы подготовлен, длина:', resultsTableHtml.length, 'символов');
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
        ResultsTable: resultsTableHtml,
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
      console.log('ResultsTable_html_length:', resultsTableHtml ? `${resultsTableHtml.length} символов` : 'не предоставлена');

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateArrayBuffer);

      // Создаем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
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
   * Создает HTML строку таблицы для вставки в шаблон
   */
  private createTableHtml(tableElement: HTMLElement): string {
    try {
      console.log('Создаем HTML таблицы для шаблона...');
      
      // Клонируем элемент для безопасного изменения
      const clonedTable = tableElement.cloneNode(true) as HTMLElement;
      
      // Применяем стили для лучшего отображения в DOCX
      this.enhanceTableHtmlForDocx(clonedTable);
      
      const tableHtml = clonedTable.outerHTML;
      console.log('HTML таблицы создан, длина:', tableHtml.length, 'символов');
      
      return tableHtml;
      
    } catch (error) {
      console.error('Ошибка создания HTML таблицы:', error);
      throw new Error(`Ошибка создания HTML таблицы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Улучшает HTML таблицы для отображения в DOCX
   */
  private enhanceTableHtmlForDocx(tableElement: HTMLElement): void {
    // Добавляем инлайн стили для лучшего отображения в DOCX
    const table = tableElement.querySelector('table');
    if (table) {
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';
      table.style.fontSize = '12pt';
      table.style.fontFamily = 'Arial, sans-serif';
    }
    
    // Стилизуем заголовки
    const headers = tableElement.querySelectorAll('th');
    headers.forEach(th => {
      const htmlTh = th as HTMLElement;
      htmlTh.style.backgroundColor = '#f3f4f6';
      htmlTh.style.border = '1px solid #d1d5db';
      htmlTh.style.padding = '8px';
      htmlTh.style.fontWeight = 'bold';
      htmlTh.style.textAlign = 'left';
    });
    
    // Стилизуем ячейки
    const cells = tableElement.querySelectorAll('td');
    cells.forEach(td => {
      const htmlTd = td as HTMLElement;
      htmlTd.style.border = '1px solid #d1d5db';
      htmlTd.style.padding = '8px';
      htmlTd.style.textAlign = 'left';
      
      // Сохраняем цветовые выделения
      if (htmlTd.classList.contains('bg-blue-200')) {
        htmlTd.style.backgroundColor = '#bfdbfe';
      }
      if (htmlTd.classList.contains('bg-red-200')) {
        htmlTd.style.backgroundColor = '#fecaca';
      }
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