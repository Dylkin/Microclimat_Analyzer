import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";

export class ReportGenerator {
  private static instance: ReportGenerator;
  private generatedReports: Map<string, Blob> = new Map();
  private generatedCharts: Map<string, Blob> = new Map();

  private constructor() {}

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  async generateReport(
    templateFile: File,
    reportData: any,
    chartElement?: HTMLElement
  ): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      console.log('Начинаем генерацию отчета...');
      
      // Генерируем имя файла
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Отчет_${reportData.reportNumber || 'без_номера'}_${timestamp}.docx`;

      // Читаем шаблон
      const templateBuffer = await templateFile.arrayBuffer();
      const templateZip = await JSZip.loadAsync(templateBuffer);

      // Генерируем график если есть элемент
      let chartImageData = '';
      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: 1200,
            height: 400
          });
          chartImageData = canvas.toDataURL('image/png');
          
          // Сохраняем график отдельно
          canvas.toBlob((blob) => {
            if (blob) {
              const chartFileName = fileName.replace('.docx', '_график.png');
              this.generatedCharts.set(chartFileName, blob);
            }
          }, 'image/png');
        } catch (error) {
          console.warn('Ошибка генерации графика:', error);
        }
      }

      // Проверяем, существует ли уже файл с таким именем (без timestamp)
      const baseFileName = `Отчет_${reportData.reportNumber || 'без_номера'}`;
      const existingFileName = Array.from(this.generatedReports.keys())
        .find(name => name.startsWith(baseFileName) && name.endsWith('.docx'));

      let finalBlob: Blob;
      let finalFileName: string;

      if (existingFileName) {
        // Объединяем с существующим отчетом
        console.log('Объединяем с существующим отчетом:', existingFileName);
        const result = await this.mergeWithExistingReport(
          existingFileName,
          templateZip,
          reportData,
          chartImageData
        );
        finalBlob = result.blob;
        finalFileName = result.fileName;
      } else {
        // Создаем новый отчет
        console.log('Создаем новый отчет');
        finalBlob = await this.createNewReport(templateZip, reportData, chartImageData);
        finalFileName = fileName;
      }

      // Сохраняем отчет
      this.generatedReports.set(finalFileName, finalBlob);
      
      // Скачиваем файл
      saveAs(finalBlob, finalFileName);

      return { success: true, fileName: finalFileName };

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      return {
        success: false,
        fileName: '',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  private async mergeWithExistingReport(
    existingFileName: string,
    newTemplateZip: JSZip,
    reportData: any,
    chartImageData: string
  ): Promise<{ blob: Blob; fileName: string }> {
    try {
      // Получаем существующий отчет
      const existingBlob = this.generatedReports.get(existingFileName);
      if (!existingBlob) {
        throw new Error('Существующий отчет не найден');
      }

      // Читаем существующий отчет
      const existingZip = await JSZip.loadAsync(existingBlob);
      
      // Создаем новый отчет из шаблона
      const newReportZip = await this.processTemplate(newTemplateZip, reportData, chartImageData);
      
      // Простое объединение: добавляем содержимое нового отчета к существующему
      const mergedZip = await this.simpleMergeDocuments(existingZip, newReportZip);
      
      // Генерируем новое имя файла с обновленным timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const baseFileName = existingFileName.replace(/(_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})?\.docx$/, '');
      const newFileName = `${baseFileName}_${timestamp}.docx`;
      
      // Удаляем старый файл из коллекции
      this.generatedReports.delete(existingFileName);
      
      const blob = await mergedZip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      return { blob, fileName: newFileName };

    } catch (error) {
      console.error('Ошибка объединения отчетов:', error);
      // Fallback: создаем новый отчет
      const blob = await this.createNewReport(newTemplateZip, reportData, chartImageData);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Отчет_${reportData.reportNumber || 'без_номера'}_${timestamp}.docx`;
      return { blob, fileName };
    }
  }

  private async createNewReport(
    templateZip: JSZip,
    reportData: any,
    chartImageData: string
  ): Promise<Blob> {
    const processedZip = await this.processTemplate(templateZip, reportData, chartImageData);
    
    return await processedZip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  private async processTemplate(
    templateZip: JSZip,
    reportData: any,
    chartImageData: string
  ): Promise<JSZip> {
    const zip = templateZip.clone();

    // Читаем document.xml
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Не найден document.xml в шаблоне');
    }

    // Заменяем плейсхолдеры
    let processedXml = this.replacePlaceholders(documentXml, reportData);

    // Добавляем график если есть
    if (chartImageData) {
      const { xml: xmlWithChart, imageData } = await this.insertChart(processedXml, chartImageData);
      processedXml = xmlWithChart;
      
      if (imageData) {
        // Добавляем изображение в архив
        zip.file('word/media/image1.png', imageData, { base64: true });
        
        // Обновляем relationships
        await this.updateRelationships(zip);
      }
    }

    // Сохраняем обновленный document.xml
    zip.file('word/document.xml', processedXml);

    return zip;
  }

  private async simpleMergeDocuments(existingZip: JSZip, newZip: JSZip): Promise<JSZip> {
    try {
      // Читаем содержимое обоих документов
      const existingDoc = await existingZip.file('word/document.xml')?.async('text');
      const newDoc = await newZip.file('word/document.xml')?.async('text');

      if (!existingDoc || !newDoc) {
        throw new Error('Не удалось прочитать содержимое документов');
      }

      // Извлекаем body из нового документа
      const newBodyMatch = newDoc.match(/<w:body[^>]*>(.*)<\/w:body>/s);
      if (!newBodyMatch) {
        throw new Error('Не найден body в новом документе');
      }

      const newBodyContent = newBodyMatch[1];

      // Добавляем разрыв страницы и содержимое нового документа к существующему
      const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      const mergedDoc = existingDoc.replace(
        '</w:body>',
        `${pageBreak}${newBodyContent}</w:body>`
      );

      // Создаем новый архив на основе существующего
      const mergedZip = existingZip.clone();
      mergedZip.file('word/document.xml', mergedDoc);

      // Копируем медиа файлы из нового документа если есть
      const mediaFolder = newZip.folder('word/media');
      if (mediaFolder) {
        await Promise.all(
          Object.keys(mediaFolder.files).map(async (fileName) => {
            const file = mediaFolder.files[fileName];
            if (!file.dir) {
              const content = await file.async('arraybuffer');
              mergedZip.file(`word/media/${fileName}`, content);
            }
          })
        );
      }

      return mergedZip;

    } catch (error) {
      console.error('Ошибка простого объединения:', error);
      throw error;
    }
  }

  private replacePlaceholders(xml: string, data: any): string {
    let result = xml;

    // Основные плейсхолдеры
    const placeholders = {
      '{Report No.}': data.reportNumber || '',
      '{Report date}': data.reportDate ? new Date(data.reportDate).toLocaleDateString('ru-RU') : '',
      '{name of the object}': data.objectName || '',
      '{name of the air conditioning system}': data.climateSystemName || '',
      '{name of the test}': this.getTestTypeName(data.testType) || '',
      '{acceptance criteria}': this.getAcceptanceCriteria(data.limits) || '',
      '{executor}': data.user?.fullName || '',
      '{director}': data.director || '',
      '{test date}': new Date().toLocaleDateString('ru-RU'),
      '{Result}': data.conclusion || '',
      '{Date time of test start}': this.getTestStartTime(data.markers),
      '{Date time of test completion}': this.getTestEndTime(data.markers),
      '{Duration of the test}': this.getTestDuration(data.markers)
    };

    // Заменяем плейсхолдеры
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(this.escapeRegExp(placeholder), 'g'), String(value));
    });

    // Заменяем таблицу результатов
    result = this.replaceResultsTable(result, data.resultsTableData || []);

    return result;
  }

  private replaceResultsTable(xml: string, tableData: any[]): string {
    if (tableData.length === 0) {
      return xml.replace('{Results table}', 'Нет данных для отображения');
    }

    // Создаем HTML таблицу
    let tableHtml = `
      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
        </w:tblPr>
        <w:tr>
          <w:tc><w:p><w:r><w:t>№ зоны</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Уровень (м.)</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Логгер</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>S/N</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Мин. t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Макс. t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Среднее t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Соответствие</w:t></w:r></w:p></w:tc>
        </w:tr>`;

    tableData.forEach(row => {
      tableHtml += `
        <w:tr>
          <w:tc><w:p><w:r><w:t>${row.zoneNumber || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.measurementLevel || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.loggerName || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.serialNumber || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.minTemp || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.maxTemp || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.avgTemp || ''}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${row.meetsLimits || ''}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
    });

    tableHtml += '</w:tbl>';

    return xml.replace('{Results table}', tableHtml);
  }

  private async insertChart(xml: string, chartImageData: string): Promise<{ xml: string; imageData?: string }> {
    if (!chartImageData || !chartImageData.startsWith('data:image/png;base64,')) {
      return { xml: xml.replace('{chart}', 'График недоступен') };
    }

    const base64Data = chartImageData.split(',')[1];
    
    // Создаем XML для изображения
    const imageXml = `
      <w:p>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="6096000" cy="2286000"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="1" name="График"/>
              <wp:cNvGraphicFramePr/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="1" name="График"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="rId1"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="6096000" cy="2286000"/>
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

    return {
      xml: xml.replace('{chart}', imageXml),
      imageData: base64Data
    };
  }

  private async updateRelationships(zip: JSZip): Promise<void> {
    try {
      const relsFile = zip.file('word/_rels/document.xml.rels');
      if (!relsFile) return;

      let relsXml = await relsFile.async('text');
      
      // Добавляем связь с изображением если её нет
      if (!relsXml.includes('rId1')) {
        const imageRel = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>';
        relsXml = relsXml.replace('</Relationships>', `${imageRel}</Relationships>`);
        zip.file('word/_rels/document.xml.rels', relsXml);
      }
    } catch (error) {
      console.warn('Ошибка обновления relationships:', error);
    }
  }

  private getTestTypeName(testType: string): string {
    const types: { [key: string]: string } = {
      'empty-object': 'Соответствие критериям в пустом объекте',
      'loaded-object': 'Соответствие критериям в загруженном объекте',
      'door-opening': 'Открытие двери',
      'power-off': 'Отключение электропитания',
      'power-on': 'Включение электропитания'
    };
    return types[testType] || testType;
  }

  private getAcceptanceCriteria(limits: any): string {
    if (!limits || (!limits.temperature && !limits.humidity)) {
      return 'Критерии не установлены';
    }

    let criteria = '';
    if (limits.temperature) {
      const { min, max } = limits.temperature;
      if (min !== undefined && max !== undefined) {
        criteria += `Температура: от ${min}°C до ${max}°C`;
      } else if (min !== undefined) {
        criteria += `Температура: не менее ${min}°C`;
      } else if (max !== undefined) {
        criteria += `Температура: не более ${max}°C`;
      }
    }

    if (limits.humidity) {
      const { min, max } = limits.humidity;
      if (criteria) criteria += '; ';
      if (min !== undefined && max !== undefined) {
        criteria += `Влажность: от ${min}% до ${max}%`;
      } else if (min !== undefined) {
        criteria += `Влажность: не менее ${min}%`;
      } else if (max !== undefined) {
        criteria += `Влажность: не более ${max}%`;
      }
    }

    return criteria || 'Критерии не установлены';
  }

  private getTestStartTime(markers: any[]): string {
    if (!markers || markers.length === 0) return '';
    const startMarker = markers.find(m => m.label?.toLowerCase().includes('начал'));
    return startMarker ? new Date(startMarker.timestamp).toLocaleString('ru-RU') : '';
  }

  private getTestEndTime(markers: any[]): string {
    if (!markers || markers.length === 0) return '';
    const endMarker = markers.find(m => m.label?.toLowerCase().includes('конец') || m.label?.toLowerCase().includes('завершен'));
    return endMarker ? new Date(endMarker.timestamp).toLocaleString('ru-RU') : '';
  }

  private getTestDuration(markers: any[]): string {
    if (!markers || markers.length < 2) return '';
    
    const startMarker = markers.find(m => m.label?.toLowerCase().includes('начал'));
    const endMarker = markers.find(m => m.label?.toLowerCase().includes('конец') || m.label?.toLowerCase().includes('завершен'));
    
    if (!startMarker || !endMarker) return '';
    
    const duration = endMarker.timestamp - startMarker.timestamp;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ч ${minutes} мин`;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Методы для управления сгенерированными файлами
  deleteReport(fileName: string): boolean {
    return this.generatedReports.delete(fileName);
  }

  downloadReport(fileName: string): boolean {
    const blob = this.generatedReports.get(fileName);
    if (blob) {
      saveAs(blob, fileName);
      return true;
    }
    return false;
  }

  downloadChart(fileName: string): boolean {
    const blob = this.generatedCharts.get(fileName);
    if (blob) {
      saveAs(blob, fileName);
      return true;
    }
    return false;
  }

  async generateExampleTemplate(): Promise<boolean> {
    try {
      // Создаем простой DOCX документ как пример шаблона
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ОТЧЕТ № {Report No.}",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "от {Report date}",
                  size: 24
                })
              ],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "О РЕЗУЛЬТАТАХ ИСПЫТАНИЙ МИКРОКЛИМАТА",
                  bold: true,
                  size: 24
                })
              ],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. ОБЩИЕ СВЕДЕНИЯ",
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun("Объект исследования: "),
                new TextRun("{name of the object}")
              ]
            }),
            new Paragraph({
              children: [
                new TextRun("Климатическая установка: "),
                new TextRun("{name of the air conditioning system}")
              ]
            }),
            new Paragraph({
              children: [
                new TextRun("Вид испытания: "),
                new TextRun("{name of the test}")
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. КРИТЕРИИ ПРИЕМКИ",
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun("{acceptance criteria}")]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. РЕЗУЛЬТАТЫ ИЗМЕРЕНИЙ",
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun("{Results table}")]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. ГРАФИЧЕСКОЕ ПРЕДСТАВЛЕНИЕ ДАННЫХ",
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun("{chart}")]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "5. ЗАКЛЮЧЕНИЕ",
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun("{Result}")]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "6. ИСПОЛНИТЕЛИ",
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun("Исполнитель: "),
                new TextRun("{executor}")
              ]
            }),
            new Paragraph({
              children: [
                new TextRun("Руководитель: "),
                new TextRun("{director}")
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun("Дата составления отчета: "),
                new TextRun("{test date}")
              ]
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'Пример_шаблона_отчета.docx');
      return true;
    } catch (error) {
      console.error('Ошибка создания примера шаблона:', error);
      return false;
    }
  }
}