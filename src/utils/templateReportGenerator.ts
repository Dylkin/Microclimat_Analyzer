import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { HtmlModule } from 'docxtemplater-html-module';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
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
      
      // Создаем XML таблицу
      const tableXml = this.createTableXml(data.analysisResults);
      console.log('XML таблица создана, длина:', tableXml.length);
      
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
        myTable: tableXml, // XML таблица
        myTable: this.createTableHtml(data.analysisResults), // HTML таблица
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
      console.log('tableXml_length:', tableXml.length);

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateArrayBuffer);

      // Создаем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new HtmlModule({})],
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
   * Создание HTML таблицы для вставки в DOCX
   */
  private createTableHtml(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return '<p>Нет данных для отображения</p>';
    }

    // Вычисляем глобальные минимальные и максимальные значения
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;

    // Создаем HTML таблицу
    let tableHtml = `
    <table border="1" style="border-collapse: collapse; width: 100%; font-size: 10pt;">
      <thead>
        <tr style="background-color: #D9D9D9; font-weight: bold;">
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">№ зоны измерения</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Уровень измерения (м.)</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Наименование логгера</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Серийный № логгера</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Мин. t°C</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Макс. t°C</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Среднее t°C</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #000;">Соответствие лимитам</th>
        </tr>
      </thead>
      <tbody>`;

    // Добавляем строки данных
    analysisResults.forEach((result, index) => {
      const isMinTemp = !result.isExternal && globalMinTemp !== null && 
                       !isNaN(parseFloat(result.minTemp)) && parseFloat(result.minTemp) === globalMinTemp;
      const isMaxTemp = !result.isExternal && globalMaxTemp !== null && 
                       !isNaN(parseFloat(result.maxTemp)) && parseFloat(result.maxTemp) === globalMaxTemp;

      const rowBgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
      const minTempBgColor = isMinTemp ? '#CCE5FF' : rowBgColor;
      const maxTempBgColor = isMaxTemp ? '#FFCCDD' : rowBgColor;

      const complianceColor = result.meetsLimits === 'Да' ? '#28A745' : 
                             result.meetsLimits === 'Нет' ? '#DC3545' : '#000000';

      tableHtml += `
        <tr>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${rowBgColor};">${this.escapeHtml(result.zoneNumber || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${rowBgColor};">${this.escapeHtml(result.measurementLevel || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${rowBgColor};">${this.escapeHtml(result.loggerName || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${rowBgColor};">${this.escapeHtml(result.serialNumber || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${minTempBgColor};">${this.escapeHtml(result.minTemp || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${maxTempBgColor};">${this.escapeHtml(result.maxTemp || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${rowBgColor};">${this.escapeHtml(result.avgTemp || '-')}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #000; background-color: ${rowBgColor}; color: ${complianceColor}; font-weight: bold;">${this.escapeHtml(result.meetsLimits || '-')}</td>
        </tr>`;
    });

    // Закрываем таблицу
    tableHtml += `
      </tbody>
    </table>`;

    return tableHtml;
  }

  private escapeHtml(text: string): string {
    // Проверяем, что text является строкой
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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