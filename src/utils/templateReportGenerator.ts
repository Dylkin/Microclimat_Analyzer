import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createReport } from 'docx-templates';

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
      ResultsTable: data.resultsTableHtml ? this.convertHtmlToDocxTable(data.resultsTableHtml) : { rows: [] }
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
   * Конвертирует HTML таблицу в структуру для docx-templates
   */
  private convertHtmlToDocxTable(htmlTable: string): any {
    if (!htmlTable) {
      return { rows: [] };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlTable, 'text/html');
      const table = doc.querySelector('table');
      
      if (!table) {
        return { rows: [] };
      }

      const rows: any[] = [];
      
      // Обрабатываем заголовки
      const headers = table.querySelectorAll('thead th');
      if (headers.length > 0) {
        const headerCells = Array.from(headers).map(th => ({
          text: th.textContent?.trim() || '',
          bold: true,
          backgroundColor: '#f3f4f6'
        }));
        rows.push({ cells: headerCells, isHeader: true });
      }
      
      // Обрабатываем строки данных
      const dataRows = table.querySelectorAll('tbody tr');
      dataRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const cellData = Array.from(cells).map(td => {
          let text = td.textContent?.trim() || '';
          let backgroundColor = undefined;
          
          // Определяем цвет фона
          if (td.classList.contains('bg-blue-200') || 
              td.style.backgroundColor === 'rgb(191, 219, 254)') {
            backgroundColor = '#bfdbfe';
            text += ' (МИН)';
          }
          if (td.classList.contains('bg-red-200') || 
              td.style.backgroundColor === 'rgb(254, 202, 202)') {
            backgroundColor = '#fecaca';
            text += ' (МАКС)';
          }
          
          return {
            text,
            backgroundColor
          };
        });
        rows.push({ cells: cellData, isHeader: false });
      });
      
      return { rows };
      
    } catch (error) {
      console.error('Ошибка конвертации HTML таблицы:', error);
      return { rows: [] };
    }
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