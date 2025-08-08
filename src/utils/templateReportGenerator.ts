import JSZip from 'jszip';
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
      console.log('Начинаем обработку DOCX шаблона...');
      
      // Читаем шаблон как ZIP архив
      const templateArrayBuffer = await templateFile.arrayBuffer();
      const zip = await JSZip.loadAsync(templateArrayBuffer);
      
      console.log('Содержимое ZIP архива:', Object.keys(zip.files));

      // Обрабатываем основной документ
      await this.processMainDocument(zip, data);
      
      // Обрабатываем нижние колонтитулы
      await this.processFooters(zip, data);
      
      // Обрабатываем заголовки
      await this.processHeaders(zip, data);

      console.log('DOCX файл успешно модифицирован');

      // Генерируем новый DOCX файл
      const modifiedDocx = await zip.generateAsync({ type: 'blob' });
      return modifiedDocx;

    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error(`Не удалось создать отчет из шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  private async processMainDocument(zip: JSZip, data: TemplateReportData): Promise<void> {
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) {
      console.warn('Файл word/document.xml не найден');
      return;
    }

    let documentXml = await documentFile.async('text');
    console.log('Исходный document.xml найден, размер:', documentXml.length);

    // Заменяем текстовые плейсхолдеры
    documentXml = this.replacePlaceholders(documentXml, data);

    // Сохраняем модифицированный document.xml
    zip.file('word/document.xml', documentXml);
  }

  private async processFooters(zip: JSZip, data: TemplateReportData): Promise<void> {
    // Ищем файлы нижних колонтитулов
    const footerFiles = Object.keys(zip.files).filter(filename => 
      filename.startsWith('word/footer') && filename.endsWith('.xml')
    );

    console.log('Найдены файлы нижних колонтитулов:', footerFiles);

    for (const footerFile of footerFiles) {
      const file = zip.file(footerFile);
      if (file) {
        let footerXml = await file.async('text');
        console.log(`Обрабатываем нижний колонтитул: ${footerFile}`);
        
        // Заменяем плейсхолдеры в нижнем колонтитуле
        footerXml = this.replacePlaceholders(footerXml, data);
        
        // Сохраняем модифицированный нижний колонтитул
        zip.file(footerFile, footerXml);
      }
    }
  }

  private async processHeaders(zip: JSZip, data: TemplateReportData): Promise<void> {
    // Ищем файлы заголовков
    const headerFiles = Object.keys(zip.files).filter(filename => 
      filename.startsWith('word/header') && filename.endsWith('.xml')
    );

    console.log('Найдены файлы заголовков:', headerFiles);

    for (const headerFile of headerFiles) {
      const file = zip.file(headerFile);
      if (file) {
        let headerXml = await file.async('text');
        console.log(`Обрабатываем заголовок: ${headerFile}`);
        
        // Заменяем плейсхолдеры в заголовке
        headerXml = this.replacePlaceholders(headerXml, data);
        
        // Сохраняем модифицированный заголовок
        zip.file(headerFile, headerXml);
      }
    }
  }

  private replacePlaceholders(xmlContent: string, data: TemplateReportData): string {
    let modifiedXml = xmlContent;

    // Простая замена текстовых плейсхолдеров
    modifiedXml = modifiedXml.replace(/{executor}/g, this.escapeXml(data.executor));
    modifiedXml = modifiedXml.replace(/{report_date}/g, this.escapeXml(data.reportDate));

    // Обработка плейсхолдера {chart} - заменяем на текст-заглушку
    if (modifiedXml.includes('{chart}')) {
      console.log('Найден плейсхолдер {chart}, заменяем на текст');
      modifiedXml = modifiedXml.replace(/{chart}/g, '[График будет вставлен здесь]');
    }

    // Обработка плейсхолдера {results table} - заменяем на текстовое представление таблицы
    if (modifiedXml.includes('{results table}')) {
      console.log('Найден плейсхолдер {results table}, заменяем на таблицу');
      const tableText = this.createTableText(data.analysisResults);
      modifiedXml = modifiedXml.replace(/{results table}/g, tableText);
    }

    return modifiedXml;
  }

  private createTableText(analysisResults: any[]): string {
    let tableText = 'РЕЗУЛЬТАТЫ АНАЛИЗА:\n\n';
    
    // Заголовок таблицы
    tableText += '№ зоны | Уровень (м.) | Логгер | S/N | Мин. t°C | Макс. t°C | Среднее t°C | Соответствие\n';
    tableText += '-------|-------------|--------|-----|----------|-----------|-------------|-------------\n';
    
    // Строки данных
    analysisResults.forEach(result => {
      tableText += `${result.zoneNumber} | ${result.measurementLevel} | ${result.loggerName} | ${result.serialNumber} | ${result.minTemp} | ${result.maxTemp} | ${result.avgTemp} | ${result.meetsLimits}\n`;
    });

    return tableText;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}