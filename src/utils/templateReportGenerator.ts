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
      
      // Читаем document.xml - основное содержимое документа
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (!documentXml) {
        throw new Error('Не удалось найти document.xml в DOCX файле');
      }

      console.log('Исходный document.xml найден');

      // Заменяем текстовые плейсхолдеры в основном документе
      let modifiedXml = documentXml;
      modifiedXml = modifiedXml.replace(/{executor}/g, this.escapeXml(data.executor));
      modifiedXml = modifiedXml.replace(/{report_date}/g, this.escapeXml(data.reportDate));

      // Обрабатываем нижний колонтитул (footer)
      await this.processFooter(zip, data);

      // Обрабатываем плейсхолдер {chart}
      const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
      const chartImageBase64 = this.arrayBufferToBase64(chartImageBuffer);
      
      // Создаем папку media если её нет
      if (!zip.file('word/media/')) {
        zip.folder('word/media');
      }

      // Добавляем изображение в архив
      const imageName = 'image1.png';
      zip.file(`word/media/${imageName}`, chartImageBuffer);

      // Создаем связи для изображения (relationships)
      await this.updateRelationships(zip, imageName);

      // Заменяем плейсхолдер {chart} на XML для изображения
      const imageXml = this.createImageXml(imageName);
      modifiedXml = modifiedXml.replace(/{chart}/g, imageXml);

      // Обрабатываем плейсхолдер {results table}
      const tableXml = this.createResultsTableXml(data.analysisResults);
      modifiedXml = modifiedXml.replace(/{results table}/g, tableXml);

      // Сохраняем модифицированный document.xml
      zip.file('word/document.xml', modifiedXml);

      console.log('DOCX файл успешно модифицирован');

      // Генерируем новый DOCX файл
      const modifiedDocx = await zip.generateAsync({ type: 'blob' });
      return modifiedDocx;

    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error(`Не удалось создать отчет из шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  private async processFooter(zip: JSZip, data: TemplateReportData): Promise<void> {
    try {
      // Ищем файлы нижних колонтитулов
      const footerFiles = Object.keys(zip.files).filter(filename => 
        filename.startsWith('word/footer') && filename.endsWith('.xml')
      );

      for (const footerFile of footerFiles) {
        const footerXml = await zip.file(footerFile)?.async('text');
        if (footerXml) {
          console.log(`Обрабатываем нижний колонтитул: ${footerFile}`);
          
          // Заменяем плейсхолдеры в нижнем колонтитуле
          let modifiedFooterXml = footerXml;
          modifiedFooterXml = modifiedFooterXml.replace(/{executor}/g, this.escapeXml(data.executor));
          modifiedFooterXml = modifiedFooterXml.replace(/{report_date}/g, this.escapeXml(data.reportDate));
          
          // Если есть плейсхолдер {chart} в нижнем колонтитуле, заменяем его на изображение
          if (modifiedFooterXml.includes('{chart}')) {
            const imageXml = this.createImageXml('image1.png');
            modifiedFooterXml = modifiedFooterXml.replace(/{chart}/g, imageXml);
          }
          
          // Сохраняем модифицированный нижний колонтитул
          zip.file(footerFile, modifiedFooterXml);
        }
      }
    } catch (error) {
      console.error('Ошибка обработки нижнего колонтитула:', error);
    }
  }

  private async updateRelationships(zip: JSZip, imageName: string): Promise<void> {
    try {
      // Читаем существующие relationships
      const relsFile = zip.file('word/_rels/document.xml.rels');
      let relsXml = '';
      
      if (relsFile) {
        relsXml = await relsFile.async('text');
      } else {
        // Создаем базовый relationships файл
        relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
      }

      // Находим максимальный Id для создания нового
      const idMatches = relsXml.match(/Id="rId(\d+)"/g);
      let maxId = 0;
      if (idMatches) {
        idMatches.forEach(match => {
          const id = parseInt(match.match(/\d+/)?.[0] || '0');
          if (id > maxId) maxId = id;
        });
      }

      const newId = maxId + 1;
      const imageRelId = `rId${newId}`;

      // Добавляем relationship для изображения
      const imageRel = `<Relationship Id="${imageRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`;
      
      // Вставляем перед закрывающим тегом
      const modifiedRelsXml = relsXml.replace('</Relationships>', `${imageRel}</Relationships>`);

      // Создаем папку _rels если её нет
      if (!zip.file('word/_rels/')) {
        zip.folder('word/_rels');
      }

      // Сохраняем обновленный relationships файл
      zip.file('word/_rels/document.xml.rels', modifiedRelsXml);

      // Сохраняем ID для использования в XML изображения
      this.currentImageRelId = imageRelId;

    } catch (error) {
      console.error('Ошибка обновления relationships:', error);
      this.currentImageRelId = 'rId1'; // Fallback
    }
  }

  private currentImageRelId: string = 'rId1';

  private createImageXml(imageName: string): string {
    // Создаем XML для вставки изображения
    return `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:extent cx="5486400" cy="8229600"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="1" name="${imageName}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="1" name="${imageName}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${this.currentImageRelId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                    <a:stretch>
                      <a:fillRect/>
                    </a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="5486400" cy="8229600"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect">
                      <a:avLst/>
                    </a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`;
  }

  private createResultsTableXml(analysisResults: any[]): string {
    // Создаем XML для таблицы результатов
    let tableXml = `<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1000"/>
        <w:gridCol w:w="1200"/>
        <w:gridCol w:w="1200"/>
        <w:gridCol w:w="1200"/>
        <w:gridCol w:w="800"/>
        <w:gridCol w:w="800"/>
        <w:gridCol w:w="800"/>
        <w:gridCol w:w="1000"/>
      </w:tblGrid>`;

    // Заголовок таблицы
    tableXml += `<w:tr>
      ${this.createTableCell('№ зоны', true)}
      ${this.createTableCell('Уровень (м.)', true)}
      ${this.createTableCell('Логгер', true)}
      ${this.createTableCell('S/N', true)}
      ${this.createTableCell('Мин. t°C', true)}
      ${this.createTableCell('Макс. t°C', true)}
      ${this.createTableCell('Среднее t°C', true)}
      ${this.createTableCell('Соответствие', true)}
    </w:tr>`;

    // Строки данных
    analysisResults.forEach(result => {
      tableXml += `<w:tr>
        ${this.createTableCell(String(result.zoneNumber))}
        ${this.createTableCell(String(result.measurementLevel))}
        ${this.createTableCell(String(result.loggerName))}
        ${this.createTableCell(String(result.serialNumber))}
        ${this.createTableCell(String(result.minTemp))}
        ${this.createTableCell(String(result.maxTemp))}
        ${this.createTableCell(String(result.avgTemp))}
        ${this.createTableCell(String(result.meetsLimits))}
      </w:tr>`;
    });

    tableXml += '</w:tbl>';
    return tableXml;
  }

  private createTableCell(text: string, isHeader: boolean = false): string {
    const boldStart = isHeader ? '<w:b/>' : '';
    const boldEnd = isHeader ? '' : '';
    
    return `<w:tc>
      <w:tcPr>
        <w:tcW w:w="0" w:type="auto"/>
      </w:tcPr>
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            ${boldStart}
            <w:sz w:val="20"/>
          </w:rPr>
          <w:t>${this.escapeXml(text)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}