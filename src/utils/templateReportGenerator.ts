import { saveAs } from 'file-saver';
import PizZip from 'pizzip';

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
      
      // Создаем ZIP объект из шаблона
      const zip = new PizZip(templateBuffer);
      
      // Извлекаем document.xml
      const documentXml = zip.file('word/document.xml');
      if (!documentXml) {
        throw new Error('Не удалось найти document.xml в DOCX файле');
      }
      
      let documentContent = documentXml.asText();
      console.log('Извлечен document.xml, размер:', documentContent.length);
      
      // Заменяем плейсхолдеры
      documentContent = await this.replacePlaceholdersInXml(documentContent, data);
      
      // Обновляем document.xml в архиве
      zip.file('word/document.xml', documentContent);
      
      // Если есть изображение графика, добавляем его в архив
      if (data.chartImageBlob) {
        await this.addImageToDocx(zip, data.chartImageBlob);
      }
      
      // Генерируем новый DOCX файл
      const newDocxBuffer = zip.generate({ type: 'arraybuffer' });
      const blob = new Blob([newDocxBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      console.log('Отчет успешно сгенерирован');
      return blob;
      
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

  private async replacePlaceholdersInXml(xmlContent: string, data: TemplateReportData): Promise<string> {
    let updatedContent = xmlContent;
    
    console.log('Начинаем замену плейсхолдеров в XML...');
    
    // Заменяем текстовые плейсхолдеры
    updatedContent = updatedContent.replace(
      new RegExp(this.escapeRegExp(TemplateReportGenerator.PLACEHOLDERS.EXECUTOR), 'g'),
      this.escapeXml(data.executor)
    );
    
    updatedContent = updatedContent.replace(
      new RegExp(this.escapeRegExp(TemplateReportGenerator.PLACEHOLDERS.REPORT_DATE), 'g'),
      this.escapeXml(data.reportDate)
    );
    
    // Заменяем плейсхолдер таблицы на XML таблицу
    if (updatedContent.includes(TemplateReportGenerator.PLACEHOLDERS.RESULTS_TABLE)) {
      const tableXml = this.createTableXml(data.analysisResults);
      updatedContent = updatedContent.replace(
        new RegExp(this.escapeRegExp(TemplateReportGenerator.PLACEHOLDERS.RESULTS_TABLE), 'g'),
        tableXml
      );
      console.log('Заменен плейсхолдер {results table}');
    }
    
    // Заменяем плейсхолдер графика на ссылку на изображение
    if (updatedContent.includes(TemplateReportGenerator.PLACEHOLDERS.CHART)) {
      const imageXml = this.createImageXml();
      updatedContent = updatedContent.replace(
        new RegExp(this.escapeRegExp(TemplateReportGenerator.PLACEHOLDERS.CHART), 'g'),
        imageXml
      );
      console.log('Заменен плейсхолдер {chart}');
    }
    
    console.log('Замена плейсхолдеров завершена');
    return updatedContent;
  }

  private createTableXml(results: any[]): string {
    if (!results || results.length === 0) {
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }

    let tableXml = `
      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="1000"/>
          <w:gridCol w:w="1200"/>
          <w:gridCol w:w="1500"/>
          <w:gridCol w:w="1200"/>
          <w:gridCol w:w="800"/>
          <w:gridCol w:w="800"/>
          <w:gridCol w:w="800"/>
          <w:gridCol w:w="1000"/>
        </w:tblGrid>
        <w:tr>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>№ зоны</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Уровень (м.)</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Логгер</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>S/N</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Мин.t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Макс.t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Среднее t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Соответствие</w:t></w:r></w:p></w:tc>
        </w:tr>`;

    // Добавляем строки данных
    results.forEach(result => {
      tableXml += `
        <w:tr>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.zoneNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.measurementLevel)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.loggerName)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.serialNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.minTemp)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.maxTemp)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.avgTemp)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(result.meetsLimits)}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
    });

    tableXml += '</w:tbl>';
    return tableXml;
  }

  private createImageXml(): string {
    // Создаем XML для вставки изображения
    return `
      <w:p>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="5486400" cy="4114800"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="1" name="Chart"/>
              <wp:cNvGraphicFramePr/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="1" name="Chart"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="rId4"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="5486400" cy="4114800"/>
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

  private async addImageToDocx(zip: PizZip, imageBlob: Blob): Promise<void> {
    try {
      // Добавляем изображение в папку media
      const imageBuffer = await imageBlob.arrayBuffer();
      zip.file('word/media/image1.png', imageBuffer);

      // Обновляем relationships
      const relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

      zip.file('word/_rels/document.xml.rels', relsContent);

      // Обновляем Content_Types.xml
      let contentTypes = zip.file('[Content_Types].xml')?.asText() || '';
      if (!contentTypes.includes('image/png')) {
        contentTypes = contentTypes.replace(
          '</Types>',
          '  <Default Extension="png" ContentType="image/png"/>\n</Types>'
        );
        zip.file('[Content_Types].xml', contentTypes);
      }

      console.log('Изображение добавлено в DOCX архив');
    } catch (error) {
      console.error('Ошибка добавления изображения:', error);
    }
  }

  private escapeXml(text: string | number): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    saveAs(blob, filename);
  }
}