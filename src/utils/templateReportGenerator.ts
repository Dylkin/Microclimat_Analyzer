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

      // ВАЖНО: Добавляем изображение в document.xml ПОСЛЕ рендеринга шаблона
      await this.insertImageIntoDocument(zip, chartImageBuffer);

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
   * Вставляет изображение в document.xml с правильным XML элементом
   */
  private async insertImageIntoDocument(zip: PizZip, imageBuffer: ArrayBuffer): Promise<void> {
    try {
      console.log('Вставляем изображение в document.xml...');
      
      // Читаем document.xml
      let documentXml = '';
      try {
        documentXml = zip.file('word/document.xml').asText();
      } catch (error) {
        console.error('Не удалось прочитать document.xml:', error);
        return;
      }

      console.log('Размер document.xml:', documentXml.length);
      
      // Находим максимальный rId в relationships для использования правильного ID
      let relationshipId = 'rId10'; // По умолчанию используем rId10
      
      try {
        const relsXml = zip.file('word/_rels/document.xml.rels').asText();
        const rIdMatches = relsXml.match(/rId(\d+)/g) || [];
        if (rIdMatches.length > 0) {
          const maxRId = Math.max(...rIdMatches.map(id => parseInt(id.replace('rId', ''))));
          relationshipId = `rId${maxRId}`;
          console.log('Используем relationship ID:', relationshipId);
        }
      } catch (error) {
        console.warn('Не удалось определить relationship ID, используем rId10');
      }

      // Добавляем необходимые пространства имен в корневой элемент
      let updatedXml = this.addNamespacesToDocument(documentXml);

      // Создаем XML для изображения с правильным relationship ID
      const imageXml = this.createImageXml(relationshipId);
      
      let imageInserted = false;
      
      // Вариант 1: Заменяем плейсхолдер {chart} внутри w:body если он есть
      if (updatedXml.includes('{chart}')) {
        console.log('Найден плейсхолдер {chart}, заменяем на изображение');
        const paragraphWithImage = `
      <w:p>
        <w:r>
          ${imageXml}
        </w:r>
      </w:p>`;
        updatedXml = updatedXml.replace('{chart}', paragraphWithImage);
        imageInserted = true;
      }
      
      // Вариант 2: Если плейсхолдера нет, вставляем внутри w:body перед w:sectPr или перед </w:body>
      if (!imageInserted) {
        const paragraphWithImage = `
      <w:p>
        <w:r>
          ${imageXml}
        </w:r>
      </w:p>`;
        
        // Пытаемся вставить перед w:sectPr (если есть)
        if (updatedXml.includes('<w:sectPr>')) {
          console.log('Вставляем изображение перед <w:sectPr>');
          updatedXml = updatedXml.replace('<w:sectPr>', `${paragraphWithImage}\n    <w:sectPr>`);
          imageInserted = true;
        }
        // Иначе вставляем перед </w:body>
        else if (updatedXml.includes('</w:body>')) {
          console.log('Вставляем изображение перед </w:body>');
          updatedXml = updatedXml.replace('</w:body>', `${paragraphWithImage}\n  </w:body>`);
          imageInserted = true;
        }
      }
      
      // Вариант 3: Если нет w:body, создаем его
      if (!imageInserted) {
        console.log('Создаем новый w:body с изображением');
        const paragraphWithImage = `
  <w:body>
    <w:p>
      <w:r>
        ${imageXml}
      </w:r>
    </w:p>
  </w:body>`;
        updatedXml = updatedXml.replace('</w:document>', `${paragraphWithImage}</w:document>`);
        imageInserted = true;
      }
      
      // Проверяем, было ли изображение вставлено
      if (!imageInserted) {
        console.error('Не удалось найти подходящее место для вставки изображения');
        return;
      }

      // Обновляем document.xml в ZIP
      zip.file('word/document.xml', updatedXml);
      console.log('Изображение успешно вставлено в document.xml с ID:', relationshipId);
      
    } catch (error) {
      console.error('Ошибка вставки изображения в document.xml:', error);
    }
  }

  /**
   * Добавляет необходимые пространства имен в корневой элемент document.xml
   */
  private addNamespacesToDocument(documentXml: string): string {
    // Проверяем, есть ли уже необходимые пространства имен
    const requiredNamespaces = [
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
    ];

    let updatedXml = documentXml;

    // Находим открывающий тег w:document
    const documentTagMatch = updatedXml.match(/<w:document[^>]*>/);
    if (!documentTagMatch) {
      console.warn('Не найден тег w:document');
      return documentXml;
    }

    const documentTag = documentTagMatch[0];
    let newDocumentTag = documentTag;

    // Добавляем недостающие пространства имен
    requiredNamespaces.forEach(namespace => {
      const namespacePrefix = namespace.split('=')[0];
      if (!newDocumentTag.includes(namespacePrefix)) {
        // Вставляем перед закрывающим >
        newDocumentTag = newDocumentTag.replace('>', ` ${namespace}>`);
      }
    });

    // Заменяем старый тег на новый
    if (newDocumentTag !== documentTag) {
      updatedXml = updatedXml.replace(documentTag, newDocumentTag);
      console.log('Добавлены пространства имен в w:document');
    }

    return updatedXml;
  }
  /**
   * Создает XML элемент для изображения
   */
  private createImageXml(relationshipId: string): string {
    return `
<w:drawing>
  <wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="7620000" cy="5715000"/>
    <wp:effectExtent l="0" t="0" r="0" b="0"/>
    <wp:docPr id="1" name="График" descr="График временных рядов"/>
    <wp:cNvGraphicFramePr>
      <a:graphicFrameLocks noChangeAspect="1"/>
    </wp:cNvGraphicFramePr>
    <a:graphic>
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic>
          <pic:nvPicPr>
            <pic:cNvPr id="1" name="График"/>
            <pic:cNvPicPr/>
          </pic:nvPicPr>
          <pic:blipFill>
            <a:blip r:embed="${relationshipId}"/>
            <a:stretch>
              <a:fillRect/>
            </a:stretch>
          </pic:blipFill>
          <pic:spPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="7620000" cy="5715000"/>
            </a:xfrm>
            <a:prstGeom prst="rect">
              <a:avLst/>
            </a:prstGeom>
          </pic:spPr>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>`;
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