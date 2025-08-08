import JSZip from 'jszip';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module-free';

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
      console.log('Начинаем обработку DOCX шаблона с Docxtemplater...');
      
      // Читаем шаблон как ArrayBuffer
      const templateArrayBuffer = await templateFile.arrayBuffer();
      
      // Конвертируем изображение в ArrayBuffer
      const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
      
      // Создаем ZIP из шаблона
      const zip = new PizZip(templateArrayBuffer);
      
      // Добавляем изображение в ZIP структуру вручную
      await this.addImageToZipStructure(zip, chartImageBuffer);
      
      // Настраиваем модуль для изображений
      const imageOpts = {
        centered: true,
        fileType: 'docx',
        getImage: (tagValue: string, tagName: string) => {
          console.log(`Обработка изображения для тега: ${tagName}`);
          if (tagName === 'chart') {
            return chartImageBuffer;
          }
          throw new Error(`Неизвестный тег изображения: ${tagName}`);
        },
        getSize: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log(`Установка размера изображения для тега: ${tagName}`);
          if (tagName === 'chart') {
            // Размеры в пикселях для DOCX (конвертируются в EMU автоматически)
            return [800, 600]; // ширина x высота
          }
          throw new Error(`Неизвестный тег изображения для размера: ${tagName}`);
        },
        getProps: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log(`Установка свойств изображения для тега: ${tagName}`);
          return {
            extension: 'png',
            mime: 'image/png',
            name: 'image1.png'
          };
        }
      };

      const imageModule = new ImageModule(imageOpts);

      // Создаем экземпляр Docxtemplater
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      }
      )
      // Создаем таблицу результатов в формате HTML/текст
      const resultsTable = this.createResultsTable(data.analysisResults);

      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        report_date: data.reportDate,
        // НЕ добавляем chart в templateData - только через imageModule
        results_table: resultsTable
      };

      console.log('Данные для шаблона:', {
        executor: data.executor,
        report_date: data.reportDate,
        chart_image_size: `${chartImageBuffer.byteLength} байт`
      });

      // Заполняем шаблон данными
      doc.setData(templateData);

      try {
        // Рендерим документ
        doc.render();
        console.log('Документ успешно отрендерен');
      } catch (error) {
        console.error('Ошибка рендеринга документа:', error);
        
        // Выводим подробную информацию об ошибке
        if (error.properties && error.properties.errors instanceof Array) {
          const errorMessages = error.properties.errors.map((err: any) => {
            return `${err.name}: ${err.message} в части "${err.part}"`;
          }).join('\n');
          console.error('Детали ошибок:', errorMessages);
        }
        
        throw error;
      }

      // Генерируем новый DOCX файл
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      console.log('DOCX файл успешно сгенерирован');
      return output;

    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error(`Не удалось создать отчет из шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Добавляет изображение в ZIP структуру DOCX файла
   */
  private async addImageToZipStructure(zip: PizZip, imageBuffer: ArrayBuffer): Promise<void> {
    try {
      console.log('Добавляем изображение в ZIP структуру...');
      
      // 1. Создаем папку word/media/ и добавляем изображение
      const imagePath = 'word/media/image1.png';
      zip.file(imagePath, imageBuffer);
      console.log(`Изображение добавлено в ${imagePath}`);
      
      // 2. Обновляем [Content_Types].xml
      await this.updateContentTypes(zip);
      
      // 3. Обновляем word/_rels/document.xml.rels
      await this.updateDocumentRels(zip);
      
    } catch (error) {
      console.error('Ошибка добавления изображения в ZIP структуру:', error);
      throw error;
    }
  }

  /**
   * Обновляет [Content_Types].xml для поддержки PNG изображений
   */
  private async updateContentTypes(zip: PizZip): Promise<void> {
    try {
      const contentTypesPath = '[Content_Types].xml';
      let contentTypesXml = '';
      
      // Читаем существующий файл или создаем новый
      try {
        contentTypesXml = zip.file(contentTypesPath).asText();
      } catch (error) {
        console.log('Создаем новый [Content_Types].xml');
        contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
      }
      
      // Добавляем PNG тип если его нет
      if (!contentTypesXml.includes('Extension="png"')) {
        const pngDefault = '  <Default Extension="png" ContentType="image/png"/>';
        contentTypesXml = contentTypesXml.replace(
          '</Types>',
          `${pngDefault}\n</Types>`
        );
        
        zip.file(contentTypesPath, contentTypesXml);
        console.log('Обновлен [Content_Types].xml');
      }
      
    } catch (error) {
      console.error('Ошибка обновления Content_Types.xml:', error);
      throw error;
    }
  }

  /**
   * Обновляет word/_rels/document.xml.rels для связи с изображением
   */
  private async updateDocumentRels(zip: PizZip): Promise<void> {
    try {
      const relsPath = 'word/_rels/document.xml.rels';
      let relsXml = '';
      
      // Читаем существующий файл или создаем новый
      try {
        relsXml = zip.file(relsPath).asText();
      } catch (error) {
        console.log('Создаем новый document.xml.rels');
        relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
      }
      
      // Находим максимальный rId
      const rIdMatches = relsXml.match(/rId(\d+)/g) || [];
      const maxRId = rIdMatches.length > 0 
        ? Math.max(...rIdMatches.map(id => parseInt(id.replace('rId', '')))) 
        : 0;
      const newRId = maxRId + 1;
      
      // Добавляем связь с изображением если её нет
      const imageRelId = `rId${newRId}`;
      if (!relsXml.includes('media/image1.png')) {
        const imageRelationship = `  <Relationship Id="${imageRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>`;
        relsXml = relsXml.replace(
          '</Relationships>',
          `${imageRelationship}\n</Relationships>`
        );
        
        zip.file(relsPath, relsXml);
        console.log(`Обновлен document.xml.rels с ${imageRelId}`);
      }
      
    } catch (error) {
      console.error('Ошибка обновления document.xml.rels:', error);
      throw error;
    }
  }
  private createResultsTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return 'Нет данных для отображения';
    }

    let table = 'РЕЗУЛЬТАТЫ АНАЛИЗА:\n\n';
    
    // Заголовок таблицы
    table += '№ зоны | Уровень (м.) | Логгер | S/N | Мин. t°C | Макс. t°C | Среднее t°C | Соответствие\n';
    table += '-------|-------------|--------|-----|----------|-----------|-------------|-------------\n';
    
    // Строки данных
    analysisResults.forEach(result => {
      const zoneNumber = result.zoneNumber === 999 ? 'Внешний' : (result.zoneNumber || '-');
      table += `${zoneNumber} | ${result.measurementLevel || '-'} | ${result.loggerName || '-'} | ${result.serialNumber || '-'} | ${result.minTemp || '-'} | ${result.maxTemp || '-'} | ${result.avgTemp || '-'} | ${result.meetsLimits || '-'}\n`;
    });

    table += '\n';
    
    // Добавляем статистику
    const validResults = analysisResults.filter(r => !r.isExternal && r.minTemp !== '-');
    const externalSensors = analysisResults.filter(r => r.isExternal).length;
    
    table += `\nОбщая статистика:\n`;
    table += `- Всего датчиков: ${analysisResults.length}\n`;
    table += `- Внутренние датчики: ${validResults.length}\n`;
    table += `- Внешние датчики: ${externalSensors}\n`;
    
    const compliantCount = analysisResults.filter(r => r.meetsLimits === 'Да').length;
    const nonCompliantCount = analysisResults.filter(r => r.meetsLimits === 'Нет').length;
    
    if (compliantCount > 0 || nonCompliantCount > 0) {
      table += `- Соответствуют лимитам: ${compliantCount}\n`;
      table += `- Не соответствуют лимитам: ${nonCompliantCount}\n`;
    }

    return table;
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