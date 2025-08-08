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

  // Фиксированный список поддерживаемых плейсхолдеров
  private static readonly PLACEHOLDERS = {
    CHART: '{chart}',
    RESULTS_TABLE: '{results table}',
    EXECUTOR: '{executor}',
    REPORT_DATE: '{report date}'
  };

  static getInstance(): TemplateReportGenerator {
    if (!TemplateReportGenerator.instance) {
      TemplateReportGenerator.instance = new TemplateReportGenerator();
    }
    return TemplateReportGenerator.instance;
  }

  static getAvailablePlaceholders(): string[] {
    return Object.values(TemplateReportGenerator.PLACEHOLDERS);
  }

  async generateReportFromTemplate(templateFile: File, data: TemplateReportData): Promise<Blob> {
    try {
      console.log('Начинаем генерацию отчета из шаблона:', templateFile.name);
      
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await this.readFileAsArrayBuffer(templateFile);
      
      // Парсим DOCX шаблон и извлекаем текстовое содержимое
      const templateContent = await this.parseDocxTemplate(templateBuffer);
      
      // Заменяем плейсхолдеры на актуальные данные
      const processedContent = await this.replacePlaceholders(templateContent, data);
      
      // Создаем новый документ с обработанным содержимым
      const doc = new Document({
        sections: [{
          children: processedContent
        }]
      });

      // Генерируем DOCX файл
      const buffer = await Packer.toBlob(doc);
      console.log('Отчет успешно сгенерирован');
      return buffer;
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error('Не удалось создать отчет из шаблона: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
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

  private async parseDocxTemplate(buffer: ArrayBuffer): Promise<string[]> {
    try {
      // Простой парсер для извлечения текста из DOCX
      // DOCX - это ZIP архив, содержащий XML файлы
      const uint8Array = new Uint8Array(buffer);
      
      // Ищем document.xml внутри архива
      const textContent = this.extractTextFromDocx(uint8Array);
      
      // Разбиваем текст на параграфы
      const paragraphs = textContent.split(/[\r\n]+/).filter(p => p.trim().length > 0);
      
      console.log('Извлечено параграфов из шаблона:', paragraphs.length);
      console.log('Содержимое шаблона:', paragraphs.slice(0, 5)); // Показываем первые 5 параграфов
      
      return paragraphs;
      
    } catch (error) {
      console.error('Ошибка парсинга DOCX шаблона:', error);
      // Возвращаем базовый шаблон с плейсхолдерами
      return [
        'ОТЧЕТ ПО АНАЛИЗУ ВРЕМЕННЫХ РЯДОВ',
        'Дата формирования: {report date}',
        'Исполнитель: {executor}',
        'График временных рядов:',
        '{chart}',
        'Результаты анализа:',
        '{results table}'
      ];
    }
  }

  private extractTextFromDocx(uint8Array: Uint8Array): string {
    // Простое извлечение текста из DOCX
    // Ищем читаемые строки в бинарных данных
    let text = '';
    let currentString = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      
      // Если это печатный ASCII символ или пробел
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        currentString += String.fromCharCode(byte);
      } else {
        // Если накопилась строка длиннее 3 символов, добавляем её
        if (currentString.length > 3) {
          text += currentString + '\n';
        }
        currentString = '';
      }
    }
    
    // Добавляем последнюю строку
    if (currentString.length > 3) {
      text += currentString;
    }
    
    return text;
  }

  private async replacePlaceholders(templateParagraphs: string[], data: TemplateReportData): Promise<Paragraph[]> {
    const processedContent: Paragraph[] = [];
    const chartImageBuffer = await data.chartImageBlob.arrayBuffer();

    console.log('Начинаем замену плейсхолдеров...');

    for (let i = 0; i < templateParagraphs.length; i++) {
      const paragraphText = templateParagraphs[i];
      
      // Проверяем каждый плейсхолдер
      if (paragraphText.includes(TemplateReportGenerator.PLACEHOLDERS.CHART)) {
        console.log('Найден плейсхолдер {chart}, вставляем изображение');
        
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
        
      } else if (paragraphText.includes(TemplateReportGenerator.PLACEHOLDERS.RESULTS_TABLE)) {
        console.log('Найден плейсхолдер {results table}, вставляем таблицу');
        
        // Заменяем плейсхолдер таблицы на таблицу результатов
        const tableRows = this.createTextTable(data.analysisResults);
        processedContent.push(...tableRows);
        
      } else {
        // Заменяем текстовые плейсхолдеры
        let newText = paragraphText
          .replace(TemplateReportGenerator.PLACEHOLDERS.EXECUTOR, data.executor)
          .replace(TemplateReportGenerator.PLACEHOLDERS.REPORT_DATE, data.reportDate);

        // Определяем стиль параграфа
        const isTitle = newText.toUpperCase().includes('ОТЧЕТ') || newText.includes('АНАЛИЗ');
        const isHeading = newText.includes(':') && newText.length < 100;
        
        const newParagraph = new Paragraph({
          children: [new TextRun({ 
            text: newText,
            size: isTitle ? 32 : isHeading ? 28 : 24,
            bold: isTitle || isHeading
          })],
          alignment: isTitle ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: isTitle ? 400 : isHeading ? 300 : 200 }
        });
        
        processedContent.push(newParagraph);
      }
    }

    console.log('Замена плейсхолдеров завершена, создано параграфов:', processedContent.length);
    return processedContent;
  }

  private createTextTable(results: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    console.log('Создаем таблицу результатов, записей:', results.length);
    
    // Заголовок таблицы
    paragraphs.push(new Paragraph({
      children: [new TextRun({ 
        text: 'Результаты анализа временных рядов',
        bold: true,
        size: 28
      })],
      spacing: { after: 200 }
    }));

    // Заголовки колонок
    paragraphs.push(new Paragraph({
      children: [new TextRun({ 
        text: '№ зоны | Уровень (м.) | Логгер | S/N | Мин.t°C | Макс.t°C | Среднее t°C | Соответствие',
        bold: true,
        size: 20
      })],
      spacing: { after: 100 }
    }));

    // Разделитель
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '─'.repeat(100), size: 20 })],
      spacing: { after: 100 }
    }));

    // Строки данных
    results.forEach((result, index) => {
      const rowText = `${result.zoneNumber} | ${result.measurementLevel} | ${result.loggerName} | ${result.serialNumber} | ${result.minTemp} | ${result.maxTemp} | ${result.avgTemp} | ${result.meetsLimits}`;
      
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: rowText, size: 18 })],
        spacing: { after: 50 }
      }));
    });

    // Добавляем пустую строку после таблицы
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '', size: 18 })],
      spacing: { after: 200 }
    }));

    return paragraphs;
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}