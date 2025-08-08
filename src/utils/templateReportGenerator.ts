import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
  executor: string;
  reportDate: string;
  dataType: 'temperature' | 'humidity';
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
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await this.readFileAsArrayBuffer(templateFile);
      
      // Парсим DOCX шаблон
      const templateContent = await this.parseDocxTemplate(templateBuffer);
      
      // Заменяем плейсхолдеры
      const processedContent = await this.replacePlaceholders(templateContent, data);
      
      // Создаем новый документ
      const doc = new Document({
        sections: [{
          children: processedContent
        }]
      });

      // Генерируем DOCX файл
      const buffer = await Packer.toBlob(doc);
      return buffer;
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error('Не удалось создать отчет из шаблона');
    }
  }

  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as ArrayBuffer);
        } else {
          reject(new Error('Не удалось прочитать файл шаблона'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла шаблона'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async parseDocxTemplate(buffer: ArrayBuffer): Promise<Paragraph[]> {
    // Упрощенный парсер DOCX - извлекаем текст и создаем базовую структуру
    // В реальном проекте здесь должен быть полноценный DOCX парсер
    
    try {
      // Конвертируем ArrayBuffer в строку для поиска плейсхолдеров
      const uint8Array = new Uint8Array(buffer);
      const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
      let content = '';
      
      // Пытаемся извлечь текст из DOCX (упрощенный подход)
      for (let i = 0; i < uint8Array.length - 10; i++) {
        const char = decoder.decode(uint8Array.slice(i, i + 1));
        if (char.match(/[a-zA-Zа-яА-Я0-9\s\{\}]/)) {
          content += char;
        }
      }

      // Разбиваем на параграфы и создаем структуру документа
      const lines = content.split(/[\r\n]+/).filter(line => line.trim().length > 0);
      
      return lines.map(line => new Paragraph({
        children: [new TextRun({ text: line.trim() })],
        spacing: { after: 200 }
      }));

    } catch (error) {
      console.error('Ошибка парсинга DOCX шаблона:', error);
      // Возвращаем базовый шаблон с плейсхолдерами
      return [
        new Paragraph({
          children: [new TextRun({ text: 'ОТЧЕТ ПО АНАЛИЗУ ВРЕМЕННЫХ РЯДОВ', bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Дата формирования: {report date}', size: 24 })],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Исполнитель: {executor}', size: 24 })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'График временных рядов:', bold: true, size: 28 })],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: '{chart}' })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Результаты анализа:', bold: true, size: 28 })],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: '{results table}' })],
          spacing: { after: 200 }
        })
      ];
    }
  }

  private async replacePlaceholders(content: Paragraph[], data: TemplateReportData): Promise<Paragraph[]> {
    const processedContent: Paragraph[] = [];
    const chartImageBuffer = await data.chartImageBlob.arrayBuffer();

    for (const paragraph of content) {
      // Получаем текст из параграфа
      const paragraphText = this.extractTextFromParagraph(paragraph);
      
      if (paragraphText.includes('{chart}')) {
        // Заменяем плейсхолдер графика на изображение
        processedContent.push(new Paragraph({
          children: [
            new ImageRun({
              data: chartImageBuffer,
              transformation: {
                width: 560,
                height: 840,
              },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }));
      } else if (paragraphText.includes('{results table}')) {
        // Заменяем плейсхолдер таблицы на таблицу результатов
        const table = this.createResultsTable(data.analysisResults);
        processedContent.push(new Paragraph({ children: [] })); // Пустой параграф для размещения таблицы
        // Примечание: В реальной реализации здесь нужно добавить таблицу в документ
        // Для упрощения добавляем текстовое представление
        processedContent.push(...this.createTextTable(data.analysisResults));
      } else {
        // Заменяем текстовые плейсхолдеры
        let newText = paragraphText
          .replace('{executor}', data.executor)
          .replace('{report date}', data.reportDate);

        // Создаем новый параграф с замененным текстом
        const newParagraph = new Paragraph({
          children: [new TextRun({ 
            text: newText,
            size: paragraphText.includes('ОТЧЕТ') ? 32 : 24,
            bold: paragraphText.includes('ОТЧЕТ') || paragraphText.includes(':')
          })],
          alignment: paragraphText.includes('ОТЧЕТ') ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 200 }
        });
        
        processedContent.push(newParagraph);
      }
    }

    return processedContent;
  }

  private extractTextFromParagraph(paragraph: Paragraph): string {
    // Упрощенное извлечение текста из параграфа
    // В реальной реализации нужно правильно обрабатывать структуру параграфа
    try {
      return (paragraph as any).root?.[0]?.children?.[0]?.children?.[0]?.text || '';
    } catch {
      return '';
    }
  }

  private createResultsTable(results: any[]): Table {
    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '№ зоны', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Уровень (м.)', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Логгер', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'S/N', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Мин. t°C', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Макс. t°C', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Среднее t°C', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Соответствие', bold: true })] })] }),
      ],
    });

    const dataRows = results.map(result => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.zoneNumber) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.measurementLevel) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.loggerName) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.serialNumber) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.minTemp) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.maxTemp) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.avgTemp) })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(result.meetsLimits) })] })] }),
      ],
    }));

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });
  }

  private createTextTable(results: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    // Заголовок таблицы
    paragraphs.push(new Paragraph({
      children: [new TextRun({ 
        text: '№ зоны | Уровень | Логгер | S/N | Мин.t°C | Макс.t°C | Среднее t°C | Соответствие',
        bold: true,
        size: 20
      })],
      spacing: { after: 100 }
    }));

    // Разделитель
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '─'.repeat(80), size: 20 })],
      spacing: { after: 100 }
    }));

    // Строки данных
    results.forEach(result => {
      const rowText = `${result.zoneNumber} | ${result.measurementLevel} | ${result.loggerName} | ${result.serialNumber} | ${result.minTemp} | ${result.maxTemp} | ${result.avgTemp} | ${result.meetsLimits}`;
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: rowText, size: 18 })],
        spacing: { after: 50 }
      }));
    });

    return paragraphs;
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}