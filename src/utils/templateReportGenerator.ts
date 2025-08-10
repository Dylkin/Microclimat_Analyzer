import JSZip from 'jszip';
import createReport from 'docx-templates';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
  resultsTableHtml: string;
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
      
      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        Report_No: data.reportNumber,
        Report_start: data.reportStart,
        report_date: data.reportDate, // Оставляем для обратной совместимости
        chart: chartImageBuffer, // ArrayBuffer изображения
        Acceptance_criteria: data.acceptanceCriteria,
        TestType: data.testType || 'Не выбрано',
        AcceptanceСriteria: data.acceptanceCriteria, // Русская С в AcceptanceСriteria
        ObjectName: data.objectName,
        CoolingSystemName: data.coolingSystemName,
        myTable: data.resultsTableHtml,
      };

      console.log('=== Данные для шаблона ===');
      console.log('executor:', data.executor);
      console.log('Report_No:', data.reportNumber);
      console.log('Report_start:', data.reportStart);
      console.log('report_date:', data.reportDate);
      console.log('chart_image_size:', `${chartImageBuffer.byteLength} байт`);
      console.log('Acceptance_criteria_length:', data.acceptanceCriteria?.length || 0);
      console.log('TestType:', data.testType);
      console.log('AcceptanceСriteria_length:', data.acceptanceCriteria?.length || 0);
      console.log('ObjectName:', data.objectName);
      console.log('CoolingSystemName:', data.coolingSystemName);
      console.log('resultsTableHtml_length:', data.resultsTableHtml?.length || 0);

      // Генерируем отчет с помощью docx-templates
      console.log('Начинаем генерацию отчета с docx-templates...');
      const reportBuffer = await createReport({
        template: templateArrayBuffer,
        data: templateData,
        cmdDelimiter: ['{', '}'],
        literalXmlDelimiter: ['{{', '}}'],
        processLineBreaks: true,
        noSandBox: false,
      });
      
      console.log('Отчет успешно сгенерирован');
      return new Blob([reportBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw error;
    }
  }

  /**
   * Создание HTML таблицы с inline стилями для вставки в DOCX
   */
  static createHtmlTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return '<p>Нет данных для отображения</p>';
    }

    // Вычисляем глобальные минимальные и максимальные значения (исключая внешние датчики)
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;

    // Базовые стили для таблицы
    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      font-family: Arial, sans-serif;
      font-size: 12px;
    `;

    const headerCellStyle = `
      border: 1px solid #000000;
      background-color: #D9D9D9;
      padding: 8px;
      text-align: center;
      font-weight: bold;
    `;

    const dataCellStyle = `
      border: 1px solid #000000;
      padding: 8px;
      text-align: center;
    `;

    const evenRowStyle = `background-color: #F8F9FA;`;
    const oddRowStyle = `background-color: #FFFFFF;`;
    const minTempStyle = `background-color: #CCE5FF;`; // Голубой для минимума
    const maxTempStyle = `background-color: #FFCCDD;`; // Розовый для максимума
    const compliantStyle = `color: #28A745;`; // Зеленый для соответствия
    const nonCompliantStyle = `color: #DC3545;`; // Красный для несоответствия

    let html = `
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${headerCellStyle}">№ зоны измерения</th>
            <th style="${headerCellStyle}">Уровень измерения (м.)</th>
            <th style="${headerCellStyle}">Наименование логгера</th>
            <th style="${headerCellStyle}">Серийный № логгера</th>
            <th style="${headerCellStyle}">Мин. t°C</th>
            <th style="${headerCellStyle}">Макс. t°C</th>
            <th style="${headerCellStyle}">Среднее t°C</th>
            <th style="${headerCellStyle}">Соответствие лимитам</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Добавляем строки данных
    analysisResults.forEach((result, index) => {
      const isMinTemp = !result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
                       globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp;
      const isMaxTemp = !result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
                       globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp;
      
      const rowBgStyle = index % 2 === 0 ? evenRowStyle : oddRowStyle;
      
      // Стили для ячеек температуры
      const minTempCellStyle = `${dataCellStyle} ${rowBgStyle} ${isMinTemp ? minTempStyle : ''}`;
      const maxTempCellStyle = `${dataCellStyle} ${rowBgStyle} ${isMaxTemp ? maxTempStyle : ''}`;
      const regularCellStyle = `${dataCellStyle} ${rowBgStyle}`;
      
      // Стиль для ячейки соответствия лимитам
      let complianceStyle = regularCellStyle;
      if (result.meetsLimits === 'Да') {
        complianceStyle += ` ${compliantStyle}`;
      } else if (result.meetsLimits === 'Нет') {
        complianceStyle += ` ${nonCompliantStyle}`;
      }

      html += `
        <tr>
          <td style="${regularCellStyle}">${result.zoneNumber || '-'}</td>
          <td style="${regularCellStyle}">${result.measurementLevel || '-'}</td>
          <td style="${regularCellStyle}">${result.loggerName || '-'}</td>
          <td style="${regularCellStyle}">${result.serialNumber || '-'}</td>
          <td style="${minTempCellStyle}">${result.minTemp || '-'}</td>
          <td style="${maxTempCellStyle}">${result.maxTemp || '-'}</td>
          <td style="${regularCellStyle}">${result.avgTemp || '-'}</td>
          <td style="${complianceStyle}"><strong>${result.meetsLimits || '-'}</strong></td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    return html;
  }
    `;
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