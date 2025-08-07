import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import { Document, Packer, Paragraph, ImageRun, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';

export interface ReportData {
  title: string;
  period: string;
  location: string;
  responsible: string;
  analysisResults: Array<{
    zoneNumber: string | number;
    measurementLevel: string;
    loggerName: string;
    serialNumber: string;
    minTemp: string | number;
    maxTemp: string | number;
    avgTemp: string | number;
    meetsLimits: string;
  }>;
}

export class ReportGenerator {
  /**
   * Захват графика и поворот на 90° против часовой стрелки
   */
  private async captureAndRotateChart(chartElement: HTMLElement): Promise<Uint8Array> {
    try {
      // Захватываем график с высоким качеством
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Создаем новый canvas для поворота
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Не удалось создать контекст canvas');
      }

      // Устанавливаем размеры повернутого canvas (меняем местами ширину и высоту)
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;

      // Перемещаем точку отсчета в центр
      ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      
      // Поворачиваем на -90 градусов (против часовой стрелки)
      ctx.rotate(-Math.PI / 2);
      
      // Рисуем исходное изображение с центрированием
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

      // Преобразуем в blob, затем в Uint8Array
      return new Promise((resolve, reject) => {
        rotatedCanvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Не удалось создать blob из canvas'));
            return;
          }
          
          const reader = new FileReader();
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            resolve(new Uint8Array(arrayBuffer));
          };
          reader.onerror = () => reject(new Error('Ошибка чтения blob'));
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      });
    } catch (error) {
      console.error('Ошибка захвата и поворота графика:', error);
      throw new Error('Не удалось захватить и повернуть график');
    }
  }

  /**
   * Обработка DOCX шаблона с заменой плейсхолдеров
   */
  private async processDocxTemplate(templateFile: File, reportData: ReportData, chartImageData: Uint8Array): Promise<Uint8Array> {
    try {
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await templateFile.arrayBuffer();
      const zip = new PizZip(templateBuffer);

      // Извлекаем document.xml
      const documentXml = zip.file('word/document.xml');
      if (!documentXml) {
        throw new Error('Не удалось найти document.xml в шаблоне');
      }

      let xmlContent = documentXml.asText();

      // Заменяем текстовые плейсхолдеры
      xmlContent = xmlContent.replace(/{title}/g, this.escapeXml(reportData.title));
      xmlContent = xmlContent.replace(/{period}/g, this.escapeXml(reportData.period));
      xmlContent = xmlContent.replace(/{location}/g, this.escapeXml(reportData.location));
      xmlContent = xmlContent.replace(/{responsible}/g, this.escapeXml(reportData.responsible));

      // Создаем таблицу результатов анализа
      const analysisTable = this.createAnalysisTableXml(reportData.analysisResults);
      xmlContent = xmlContent.replace(/{analysisResults}/g, analysisTable);

      // Обрабатываем плейсхолдер {chart}
      if (xmlContent.includes('{chart}')) {
        // Добавляем изображение в архив
        const imageId = 'chart_image.png';
        const imageRelId = 'rId999'; // Уникальный ID для связи

        // Добавляем изображение в папку media
        zip.file(`word/media/${imageId}`, chartImageData);

        // Обновляем relationships
        await this.updateRelationships(zip, imageRelId, imageId);

        // Создаем XML для изображения с сохранением пропорций
        const imageXml = this.createImageXml(imageRelId, chartImageData);
        xmlContent = xmlContent.replace(/{chart}/g, imageXml);
      }

      // Обновляем document.xml
      zip.file('word/document.xml', xmlContent);

      // Генерируем новый DOCX
      const result = zip.generate({ type: 'uint8array' });
      return result;

    } catch (error) {
      console.error('Ошибка обработки DOCX шаблона:', error);
      throw new Error(`Ошибка обработки шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Обновление relationships для изображения
   */
  private async updateRelationships(zip: PizZip, relationshipId: string, imageFileName: string): Promise<void> {
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!relsFile) {
      throw new Error('Не удалось найти файл relationships');
    }

    let relsContent = relsFile.asText();
    
    // Добавляем новую связь для изображения
    const newRelationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>`;
    
    // Вставляем перед закрывающим тегом </Relationships>
    relsContent = relsContent.replace('</Relationships>', `${newRelationship}</Relationships>`);
    
    zip.file('word/_rels/document.xml.rels', relsContent);
  }

  /**
   * Создание XML для изображения с сохранением пропорций
   */
  private createImageXml(relationshipId: string, imageData: Uint8Array): string {
    // Получаем размеры изображения (приблизительно)
    // В реальном приложении можно использовать более точные методы
    const width = 6000000; // ~6 дюймов в EMU (English Metric Units)
    const height = 4000000; // ~4 дюйма в EMU
    
    return `
      <w:p>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${width}" cy="${height}"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="1" name="Chart"/>
              <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
              </wp:cNvGraphicFramePr>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="1" name="Chart"/>
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
                        <a:ext cx="${width}" cy="${height}"/>
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
      </w:p>
    `;
  }

  /**
   * Создание XML таблицы результатов анализа
   */
  private createAnalysisTableXml(results: ReportData['analysisResults']): string {
    const headerRow = `
      <w:tr>
        <w:tc><w:p><w:r><w:t>№ зоны</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Уровень (м.)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Логгер</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>S/N</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Мин. t°C</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Макс. t°C</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Среднее t°C</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Соответствие</w:t></w:r></w:p></w:tc>
      </w:tr>
    `;

    const dataRows = results.map(result => `
      <w:tr>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(String(result.zoneNumber))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(String(result.measurementLevel))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(result.loggerName)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(result.serialNumber)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(String(result.minTemp))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(String(result.maxTemp))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(String(result.avgTemp))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${this.escapeXml(result.meetsLimits)}</w:t></w:r></w:p></w:tc>
      </w:tr>
    `).join('');

    return `
      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
        </w:tblPr>
        ${headerRow}
        ${dataRows}
      </w:tbl>
    `;
  }

  /**
   * Экранирование XML символов
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Создание простого DOCX отчета без шаблона
   */
  private async createSimpleDocxReport(reportData: ReportData, chartImageData: Uint8Array): Promise<Uint8Array> {
    try {
      // Создаем таблицу результатов
      const tableRows = reportData.analysisResults.map(result => 
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun(String(result.zoneNumber))] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(String(result.measurementLevel))] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(result.loggerName)] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(result.serialNumber)] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(String(result.minTemp))] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(String(result.maxTemp))] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(String(result.avgTemp))] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(result.meetsLimits)] })] }),
          ],
        })
      );

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun({ text: reportData.title, bold: true, size: 32 })],
            }),
            new Paragraph({
              children: [new TextRun(`Период: ${reportData.period}`)],
            }),
            new Paragraph({
              children: [new TextRun(`Местоположение: ${reportData.location}`)],
            }),
            new Paragraph({
              children: [new TextRun(`Ответственный: ${reportData.responsible}`)],
            }),
            new Paragraph({
              children: [new TextRun({ text: "График измерений:", bold: true })],
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: chartImageData,
                  transformation: {
                    width: 600,
                    height: 400,
                  },
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: "Результаты анализа:", bold: true })],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№ зоны", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Уровень (м.)", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Логгер", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S/N", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Мин. t°C", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Макс. t°C", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Среднее t°C", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Соответствие", bold: true })] })] }),
                  ],
                }),
                ...tableRows,
              ],
            }),
          ],
        }],
      });

      return await Packer.toBuffer(doc);
    } catch (error) {
      console.error('Ошибка создания простого DOCX отчета:', error);
      throw new Error('Не удалось создать отчет');
    }
  }

  /**
   * Основной метод генерации отчета
   */
  async generateReportFromTemplate(
    chartElement: HTMLElement,
    reportData: ReportData,
    templateFile?: File
  ): Promise<void> {
    try {
      // Захватываем и поворачиваем график
      const chartImageData = await this.captureAndRotateChart(chartElement);

      let docxData: Uint8Array;

      if (templateFile) {
        // Используем шаблон
        docxData = await this.processDocxTemplate(templateFile, reportData, chartImageData);
      } else {
        // Создаем простой отчет
        docxData = await this.createSimpleDocxReport(reportData, chartImageData);
      }

      // Сохраняем файл
      const fileName = `Отчет_${reportData.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      const blob = new Blob([docxData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      throw new Error(`Ошибка генерации отчета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }
}