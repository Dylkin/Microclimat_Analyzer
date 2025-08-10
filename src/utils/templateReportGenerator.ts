import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Document, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, Packer } from 'docx';

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
  resultsTableData?: any[];
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
   * Создание таблицы результатов
   */
  private createResultsTable(resultsTableData: any[]): Table {
    const rows = [];

    // Заголовок таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '№ зоны', bold: true })] })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Уровень (м.)', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Логгер', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'S/N', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Мин. t°C', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Макс. t°C', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Среднее t°C', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );

    // Данные таблицы
    resultsTableData.forEach(row => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.zoneNumber || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.measurementLevel || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.loggerName || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.serialNumber || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: typeof row.minTemp === 'number' ? `${row.minTemp}°C` : String(row.minTemp || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : String(row.maxTemp || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : String(row.avgTemp || '-') })] })]
            })
          ]
        })
      );
    });

    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });
  }

  /**
   * Создание DOCX документа с таблицей результатов
   */
  private async createDocxDocument(data: TemplateReportData): Promise<Blob> {
    const children = [];

    // Заголовок отчета
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Отчет № ${data.reportNumber}`, bold: true, size: 32 })]
      })
    );

    // Дата отчета
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Дата: ${data.reportDate}`, size: 24 })]
      })
    );

    // Объект и система охлаждения
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Объект: ${data.objectName}`, size: 24 })]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Холодильная установка: ${data.coolingSystemName}`, size: 24 })]
      })
    );

    // Тип испытания
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Тип испытания: ${data.testType}`, size: 24 })]
      })
    );

    // Критерии приемки
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Критерии приемки: ${data.acceptanceCriteria}`, size: 24 })]
      })
    );

    // Пустая строка
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

    // Заголовок таблицы результатов
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Результаты измерений:', bold: true, size: 28 })]
      })
    );

    // Создаем таблицу результатов, если данные есть
    if (data.resultsTableData && data.resultsTableData.length > 0) {
      const resultsTable = this.createResultsTable(data.resultsTableData);
      children.push(resultsTable);
    }

    // Создаем документ
    const doc = new Document({
      sections: [{
        children: children
      }]
    });

    // Генерируем DOCX файл
    const buffer = await Packer.toBlob(doc);
    return buffer;
  }
  /**
   * Генерация отчета с помощью docxtemplater
   */
  private async generateWithDocxTemplates(templateFile: File, data: TemplateReportData): Promise<Blob> {
    console.log('Используем docxtemplater для генерации отчета');
    
    try {
      // Конвертируем изображение в base64 для docxtemplater
      const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
      const uint8Array = new Uint8Array(chartImageBuffer);
      
      // Конвертируем по частям для избежания переполнения стека
      let chartImageBase64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        chartImageBase64 += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
      }
      
      // Создаем простую текстовую таблицу для вставки в шаблон
      let resultsTableHtml = '';
      if (data.resultsTableData && data.resultsTableData.length > 0) {
        resultsTableHtml = this.createHtmlTable(data.resultsTableData);
      }
      
      // Подготавливаем данные для docxtemplater (все значения должны быть строками)
      const templateData = {
        executor: data.executor || '',
        Report_No: data.reportNumber || '',
        Report_start: data.reportStart || '',
        reportDate: data.reportDate || '',
        chart_image: chartImageBase64,
        TestType: data.testType || 'Не выбрано',
        EligibilityCriteria: data.acceptanceCriteria || '',
        ObjectName: data.objectName || '',
        CoolingSystemName: data.coolingSystemName || '',
        ResultsTable: resultsTableHtml || '',
      };

      // 1. Загрузка шаблона с правильной кодировкой
      const templateBuffer = await templateFile.arrayBuffer();
      const content = new Uint8Array(templateBuffer);
      const zip = new PizZip(content);

      // 2. Инициализация docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '', // Возвращаем пустую строку для null/undefined значений
      });

      // 3. Рендер документа с подготовленными данными
      doc.render(templateData);

      // 4. Генерация файла
      const out = doc.getZip().generate({ 
        type: "blob",
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      return out;
    } catch (error) {
      console.error("Ошибка генерации документа:", error);
      
      // Добавляем дополнительную обработку ошибок
      if (error instanceof Error) {
        if (error.message.includes("charCodeAt")) {
          console.warn("Проверьте, что все передаваемые данные являются строками");
          throw new Error("Ошибка обработки данных шаблона. Убедитесь, что все поля заполнены корректно.");
        } else if (error.message.includes("Maximum call stack")) {
          console.warn("Переполнение стека - возможно, слишком большое изображение или циклические ссылки");
          throw new Error("Ошибка обработки данных - слишком большой объем данных или циклические ссылки.");
        }
      }
      
      throw error;
    }
  }

  /**
   * Создание HTML таблицы для вставки в шаблон
   */
  private createHtmlTable(resultsTableData: any[]): string {
    let html = `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: center; font-weight: bold;">№ зоны</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">Уровень (м.)</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">Логгер</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">S/N</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">Мин. t°C</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">Макс. t°C</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">Среднее t°C</th>
            <th style="padding: 8px; text-align: center; font-weight: bold;">Соответствие</th>
          </tr>
        </thead>
        <tbody>
    `;

    resultsTableData.forEach(row => {
      // Определяем цвет фона для минимальных и максимальных значений
      const minTempStyle = row.isMinTemp ? 'background-color: #dbeafe;' : '';
      const maxTempStyle = row.isMaxTemp ? 'background-color: #fecaca;' : '';
      
      // Определяем цвет для соответствия лимитам
      let complianceStyle = '';
      if (row.meetsLimits === 'Да') {
        complianceStyle = 'background-color: #dcfce7; color: #166534;';
      } else if (row.meetsLimits === 'Нет') {
        complianceStyle = 'background-color: #fef2f2; color: #dc2626;';
      }

      html += `
        <tr>
          <td style="padding: 6px; text-align: center;">${row.zoneNumber || '-'}</td>
          <td style="padding: 6px; text-align: center;">${row.measurementLevel || '-'}</td>
          <td style="padding: 6px; text-align: center;">${row.loggerName || '-'}</td>
          <td style="padding: 6px; text-align: center;">${row.serialNumber || '-'}</td>
          <td style="padding: 6px; text-align: center; ${minTempStyle}">${row.minTemp || '-'}</td>
          <td style="padding: 6px; text-align: center; ${maxTempStyle}">${row.maxTemp || '-'}</td>
          <td style="padding: 6px; text-align: center;">${row.avgTemp || '-'}</td>
          <td style="padding: 6px; text-align: center; ${complianceStyle}">${row.meetsLimits || '-'}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
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