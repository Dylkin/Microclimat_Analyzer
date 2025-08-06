import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import html2canvas from 'html2canvas';

// Типы для данных графика
interface ChartDataPoint {
  timestamp: number;
  temperature?: number;
  humidity?: number;
  fileId: string;
}

interface ChartGenerationOptions {
  width: number;
  height: number;
  dataType: 'temperature' | 'humidity';
  title: string;
  yAxisLabel: string;
}

export class ReportGenerator {
  private static instance: ReportGenerator;
  private generatedReports: Map<string, Blob> = new Map();
  private generatedCharts: Map<string, string> = new Map(); // Хранение base64 изображений графиков
  private currentChartImageData: string | null = null; // Временное хранение данных изображения для текущего отчета
  private chartRelationshipId: string = 'rId3'; // ID для связи с изображением графика (по умолчанию)

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
      console.log('Используем шаблон:', templateFile.name);
      
      // Генерируем имя файла
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Отчет_${reportData.reportNumber || 'без_номера'}_${timestamp}.docx`;

      // Создаем новый отчет с использованием библиотеки docx
      const finalBlob = await this.createReportFromTemplate(templateFile, reportData, chartElement);
      const finalFileName = fileName;

      // Сохраняем отчет
      this.generatedReports.set(finalFileName, finalBlob);
      
      // Сохраняем изображение графика если оно было создано
      if (chartElement) {
        try {
          const chartImageBase64 = await this.generateChartPNG(chartElement);
          const chartFileName = finalFileName.replace('.docx', '_график.png');
          this.generatedCharts.set(chartFileName, chartImageBase64);
        } catch (error) {
          console.warn('Не удалось сохранить изображение графика:', error);
        }
      }

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

  /**
   * Создание отчета на основе шаблона с использованием библиотеки docx
   */
  private async createReportFromTemplate(
    templateFile: File,
    reportData: any,
    chartElement?: HTMLElement
  ): Promise<Blob> {
    try {
      // Читаем шаблон как текст для извлечения плейсхолдеров
      const templateBuffer = await templateFile.arrayBuffer();
      const templateZip = await JSZip.loadAsync(templateBuffer);
      
      // Читаем document.xml из шаблона
      const documentXml = await templateZip.file('word/document.xml')?.async('text');
      if (!documentXml) {
        throw new Error('Не найден document.xml в шаблоне');
      }

      // Заменяем плейсхолдеры в XML
      let processedXml = await this.replacePlaceholders(documentXml, reportData, chartElement);

      // Создаем новый ZIP архив на основе шаблона
      const newZip = templateZip.clone();
      
      // Обновляем document.xml
      newZip.file('word/document.xml', processedXml);

      // Добавляем изображение графика если есть
      if (this.currentChartImageData) {
        await this.addChartImageToDocx(newZip);
      }

      // Обрабатываем нижний колонтитул
      await this.processFooter(newZip, reportData);
      
      // Очищаем временные данные
      this.currentChartImageData = null;
      
      // Генерируем DOCX файл
      return await newZip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

    } catch (error) {
      console.error('Ошибка создания отчета из шаблона:', error);
      throw error;
    }
  }

  private async mergeWithExistingReport(
    existingFileName: string,
    newTemplateZip: JSZip,
    reportData: any,
    chartElement?: HTMLElement
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
      const newReportZip = await this.processTemplate(newTemplateZip, reportData, chartElement);
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
      const blob = await this.createNewReport(newTemplateZip, reportData, chartElement);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Отчет_${reportData.reportNumber || 'без_номера'}_${timestamp}.docx`;
      return { blob, fileName };
    }
  }


  private async createNewReport(
    templateZip: JSZip,
    reportData: any,
    chartElement?: HTMLElement
  ): Promise<Blob> {
    const processedZip = await this.processTemplate(templateZip, reportData, chartElement);
    
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
    chartElement?: HTMLElement
  ): Promise<JSZip> {
    const zip = templateZip.clone();

    // Читаем document.xml
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Не найден document.xml в шаблоне');
    }

    // Заменяем плейсхолдеры
    let processedXml = await this.replacePlaceholders(documentXml, reportData, chartElement);


    // Сохраняем обновленный document.xml
    zip.file('word/document.xml', processedXml);

    // Добавляем изображение графика в структуру DOCX если оно было создано
    if (this.currentChartImageData) {
      await this.addChartImageToDocx(zip);
    }

    // Обрабатываем нижний колонтитул
    await this.processFooter(zip, reportData);
    
    // Очищаем временные данные
    this.currentChartImageData = null;
    
    return zip;
  }

  private async processFooter(zip: JSZip, reportData: any): Promise<void> {
    try {
      // Ищем файлы нижних колонтитулов
      const footerFiles = Object.keys(zip.files).filter(fileName => 
        fileName.startsWith('word/footer') && fileName.endsWith('.xml')
      );

      console.log('Найдены файлы нижних колонтитулов:', footerFiles);

      for (const footerFileName of footerFiles) {
        const footerFile = zip.file(footerFileName);
        if (footerFile) {
          let footerXml = await footerFile.async('text');
          console.log(`Обрабатываем нижний колонтитул: ${footerFileName}`);
          
          // Нормализуем и заменяем плейсхолдеры в нижнем колонтитуле
          footerXml = this.normalizePlaceholders(footerXml);
          footerXml = this.replacePlaceholders(footerXml, reportData);
          
          // Сохраняем обновленный нижний колонтитул
          zip.file(footerFileName, footerXml);
          console.log(`Нижний колонтитул ${footerFileName} обновлен`);
        }
      }
    } catch (error) {
      console.warn('Ошибка обработки нижнего колонтитула:', error);
      // Не прерываем процесс, если не удалось обработать колонтитул
    }
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
        // Копируем все медиа файлы, включая новые с уникальными именами
        await Promise.all(
          Object.keys(mediaFolder.files).map(async (fileName) => {
            const file = mediaFolder.files[fileName];
            if (!file.dir) {
              const content = await file.async('arraybuffer');
              // Используем полный путь файла из новой структуры
              const relativePath = fileName.replace('word/media/', '');
              mergedZip.file(`word/media/${relativePath}`, content);
            }
          })
        );
      }
      
      // Объединяем relationships из нового документа
      const newRelsFile = newZip.file('word/_rels/document.xml.rels');
      if (newRelsFile) {
        const newRelsXml = await newRelsFile.async('text');
        const existingRelsFile = mergedZip.file('word/_rels/document.xml.rels');
        
        if (existingRelsFile) {
          let existingRelsXml = await existingRelsFile.async('text');
          
          // Извлекаем новые relationships из нового документа
          const newRelationships = newRelsXml.match(/<Relationship[^>]*\/>/g) || [];
          
          newRelationships.forEach(rel => {
            // Добавляем только если такой связи еще нет
            if (!existingRelsXml.includes(rel)) {
              existingRelsXml = existingRelsXml.replace('</Relationships>', `  ${rel}\n</Relationships>`);
            }
          });
          
          mergedZip.file('word/_rels/document.xml.rels', existingRelsXml);
        }
      }

      return mergedZip;

    } catch (error) {
      console.error('Ошибка простого объединения:', error);
      throw error;
    }
  }

  private async replacePlaceholders(xml: string, data: any, chartElement?: HTMLElement): Promise<string> {
    let result = xml;

    // Сначала нормализуем XML, объединяя разбитые плейсхолдеры
    result = this.normalizePlaceholders(result);

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

    // Заменяем плейсхолдер графика
    if (chartElement) {
      const chartImageXml = await this.generateChartImageXml(chartElement);
      result = result.replace('{chart}', chartImageXml);
    } else {
      result = result.replace('{chart}', 'График недоступен');
    }

    return result;
  }

  private normalizePlaceholders(xml: string): string {
    // Список всех плейсхолдеров для нормализации
    const placeholders = [
      'Report No.',
      'Report date',
      'name of the object',
      'name of the air conditioning system',
      'name of the test',
      'acceptance criteria',
      'executor',
      'director',
      'test date',
      'Result',
      'Date time of test start',
      'Date time of test completion',
      'Duration of the test',
      'Results table',
      'chart'
    ];

    let result = xml;

    placeholders.forEach(placeholder => {
      // Создаем регулярное выражение для поиска разбитых плейсхолдеров
      // Ищем {, затем любые XML теги, затем части плейсхолдера, затем }
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = escapedPlaceholder.split(' ');
      
      if (parts.length > 1) {
        // Для многословных плейсхолдеров создаем более сложный паттерн
        let pattern = '\\{';
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            pattern += '(?:<[^>]*>)*\\s*(?:<[^>]*>)*';
          }
          pattern += parts[i];
        }
        pattern += '(?:<[^>]*>)*\\}';
        
        const regex = new RegExp(pattern, 'gi');
        result = result.replace(regex, `{${placeholder}}`);
      } else {
        // Для односложных плейсхолдеров
        const pattern = `\\{(?:<[^>]*>)*${escapedPlaceholder}(?:<[^>]*>)*\\}`;
        const regex = new RegExp(pattern, 'gi');
        result = result.replace(regex, `{${placeholder}}`);
      }
    });

    // Дополнительная очистка: удаляем XML теги внутри плейсхолдеров
    result = result.replace(/\{([^}]*)<[^>]*>([^}]*)\}/g, (match, before, after) => {
      // Если внутри плейсхолдера есть XML теги, удаляем их
      const cleanContent = (before + after).replace(/<[^>]*>/g, '');
      return `{${cleanContent}}`;
    });

    return result;
  }

  /**
   * Генерация XML для вставки изображения графика
   */
  private async generateChartImageXml(chartElement: HTMLElement): Promise<string> {
    try {
      // Захватываем изображение графика
      const canvas = await html2canvas(chartElement, {
        backgroundColor: 'white',
        scale: 2, // Увеличиваем разрешение
        useCORS: true,
        allowTaint: true
      });

      // Поворачиваем изображение на 90° против часовой стрелки
      const rotatedCanvas = this.rotateCanvas(canvas, -90);
      
      // Получаем base64 данные
      const imageData = rotatedCanvas.toDataURL('image/png');
      const base64Data = imageData.split(',')[1];
      
      // Размеры повернутого изображения (меняем местами ширину и высоту)
      const width = Math.round(rotatedCanvas.height * 0.75); // Конвертируем в EMU (English Metric Units)
      const height = Math.round(rotatedCanvas.width * 0.75);
      
      // Сохраняем изображение для добавления в ZIP
      this.currentChartImageData = base64Data;
      
      // Генерируем XML для вставки изображения
      return `
        <w:p>
          <w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="${width * 9525}" cy="${height * 9525}"/>
                <wp:effectExtent l="0" t="0" r="0" b="0"/>
                <wp:docPr id="1" name="График"/>
                <wp:cNvGraphicFramePr>
                  <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                </wp:cNvGraphicFramePr>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:nvPicPr>
                        <pic:cNvPr id="1" name="График"/>
                        <pic:cNvPicPr/>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="${this.chartRelationshipId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                        <a:stretch>
                          <a:fillRect/>
                        </a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm>
                          <a:off x="0" y="0"/>
                          <a:ext cx="${width * 9525}" cy="${height * 9525}"/>
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
    } catch (error) {
      console.error('Ошибка генерации изображения графика:', error);
      return 'График недоступен (ошибка генерации изображения)';
    }
  }

  /**
   * Получение списка сгенерированных графиков
   */
  getGeneratedCharts(): string[] {
    return Array.from(this.generatedCharts.keys());
  }

  /**
   * Скачивание сгенерированного отчета
   */
  downloadReport(fileName: string): boolean {
    try {
      const blob = this.generatedReports.get(fileName);
      if (!blob) {
        console.error(`Отчет с именем ${fileName} не найден`);
        return false;
      }

      saveAs(blob, fileName);
      return true;
    } catch (error) {
      console.error('Ошибка скачивания отчета:', error);
      return false;
    }
  }

  /**
   * Удаление сгенерированного отчета
   */
  deleteReport(fileName: string): boolean {
    try {
      const existed = this.generatedReports.has(fileName);
      if (existed) {
        this.generatedReports.delete(fileName);
        
        // Также удаляем связанный график если есть
        const chartFileName = fileName.replace('.docx', '_график.png');
        if (this.generatedCharts.has(chartFileName)) {
          this.generatedCharts.delete(chartFileName);
        }
      }
      return existed;
    } catch (error) {
      console.error('Ошибка удаления отчета:', error);
      return false;
    }
  }

  /**
   * Скачивание сгенерированного графика
   */
  downloadChart(fileName: string): boolean {
    try {
      const base64Data = this.generatedCharts.get(fileName);
      if (!base64Data) {
        console.error(`График с именем ${fileName} не найден`);
        return false;
      }

      // Создаем blob из base64 данных
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      saveAs(blob, fileName);
      return true;
    } catch (error) {
      console.error('Ошибка скачивания графика:', error);
      return false;
    }
  }

  /**
   * Генерация примера шаблона DOCX с использованием библиотеки docx
   */
  async generateExampleTemplate(): Promise<boolean> {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Заголовок документа
            new Paragraph({
              children: [
                new TextRun({
                  text: "ОТЧЕТ № {Report No.}",
                  bold: true,
                  size: 32
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "от {Report date}",
                  size: 24
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "О РЕЗУЛЬТАТАХ ИСПЫТАНИЙ МИКРОКЛИМАТА",
                  bold: true,
                  size: 28
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 }
            }),

            // 1. Общие сведения
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. ОБЩИЕ СВЕДЕНИЯ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("Объект исследования: {name of the object}")],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("Климатическая установка: {name of the air conditioning system}")],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("Вид испытания: {name of the test}")],
              spacing: { after: 400 }
            }),

            // 2. Критерии приемки
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. КРИТЕРИИ ПРИЕМКИ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("{acceptance criteria}")],
              spacing: { after: 400 }
            }),

            // 3. Период проведения испытаний
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. ПЕРИОД ПРОВЕДЕНИЯ ИСПЫТАНИЙ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("Начало испытания: {Date time of test start}")],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("Завершение испытания: {Date time of test completion}")],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("Длительность испытания: {Duration of the test}")],
              spacing: { after: 400 }
            }),

            // 4. Результаты измерений
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. РЕЗУЛЬТАТЫ ИЗМЕРЕНИЙ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("{Results table}")],
              spacing: { after: 400 }
            }),

            // 5. Графическое представление данных
            new Paragraph({
              children: [
                new TextRun({
                  text: "5. ГРАФИЧЕСКОЕ ПРЕДСТАВЛЕНИЕ ДАННЫХ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("{chart}")],
              spacing: { after: 400 }
            }),

            // 6. Заключение
            new Paragraph({
              children: [
                new TextRun({
                  text: "6. ЗАКЛЮЧЕНИЕ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Paragraph({
              children: [new TextRun("{Result}")],
              spacing: { after: 400 }
            }),

            // 7. Исполнители
            new Paragraph({
              children: [
                new TextRun({
                  text: "7. ИСПОЛНИТЕЛИ",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            // Таблица исполнителей
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({
                          text: "Исполнитель:",
                          bold: true
                        })]
                      })],
                      width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph("{executor}")],
                      width: { size: 70, type: WidthType.PERCENTAGE }
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({
                          text: "Руководитель:",
                          bold: true
                        })]
                      })]
                    }),
                    new TableCell({
                      children: [new Paragraph("{director}")]
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({
                          text: "Дата составления отчета:",
                          bold: true
                        })]
                      })]
                    }),
                    new TableCell({
                      children: [new Paragraph("{test date}")]
                    })
                  ]
                })
              ]
            })
          ]
        }]
      });

      // Генерируем DOCX файл
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Скачиваем файл
      saveAs(blob, 'Пример_шаблона_отчета.docx');
      
      return true;
    } catch (error) {
      console.error('Ошибка создания примера шаблона:', error);
      return false;
    }
  }

  /**
   * Генерация PNG изображения графика для отдельного скачивания
   */
  private async generateChartPNG(chartElement: HTMLElement): Promise<string> {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: 'white',
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    // Поворачиваем изображение на 90° против часовой стрелки
    const rotatedCanvas = this.rotateCanvas(canvas, -90);
    
    // Возвращаем base64 данные
    return rotatedCanvas.toDataURL('image/png');
  }
  /**
   * Поворот canvas на заданный угол
   */
  private rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    const rotatedCanvas = document.createElement('canvas');
    const ctx = rotatedCanvas.getContext('2d')!;
    
    // Для поворота на 90° или -90° меняем размеры местами
    if (Math.abs(degrees) === 90) {
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
    } else {
      rotatedCanvas.width = canvas.width;
      rotatedCanvas.height = canvas.height;
    }
    
    // Перемещаем точку поворота в центр
    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    
    // Поворачиваем
    ctx.rotate((degrees * Math.PI) / 180);
    
    // Рисуем исходное изображение
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotatedCanvas;
  }

  private replaceResultsTable(xml: string, tableData: any[]): string {
    if (tableData.length === 0) {
      return xml.replace('{Results table}', 'Нет данных для отображения');
    }

    // Создаем DOCX таблицу с правильными границами
    let tableHtml = `
      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>№ зоны</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Уровень (м.)</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Логгер</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>S/N</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Мин. t°C</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Макс. t°C</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Среднее t°C</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Соответствие</w:t></w:r></w:p>
          </w:tc>
        </w:tr>`;

    tableData.forEach(row => {
      tableHtml += `
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.zoneNumber || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.measurementLevel || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.loggerName || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.serialNumber || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.minTemp || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.maxTemp || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.avgTemp || ''}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${row.meetsLimits || ''}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>`;
    });

    tableHtml += '</w:tbl>';

    return xml.replace('{Results table}', tableHtml);
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

  /**
   * Добавление изображения графика в структуру DOCX
   */
  private async addChartImageToDocx(zip: JSZip): Promise<void> {
    if (!this.currentChartImageData) return;

    try {
      // Преобразуем base64 в binary данные
      const base64Data = this.currentChartImageData.split(',')[1] || this.currentChartImageData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Проверяем существование папки word/media и создаем если нужно
      if (!zip.folder('word/media')) {
        zip.folder('word')?.folder('media');
      }

      // Добавляем изображение в word/media/chart.png
      zip.file('word/media/chart.png', bytes);

      // Обязательно обновляем relationships и content types
      await this.updateDocumentRelationships(zip);
      await this.updateContentTypes(zip);

    } catch (error) {
      console.error('Ошибка добавления изображения в DOCX:', error);
      throw error;
    }
  }

  /**
   * Обновление relationships для изображения
   */
  private async updateDocumentRelationships(zip: JSZip): Promise<void> {
    const relsPath = 'word/_rels/document.xml.rels';
    const relsFile = zip.file(relsPath);
    
    if (!relsFile) {
      // Создаем новый файл relationships, если его нет
      const newRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>
</Relationships>`;
      zip.file(relsPath, newRels);
      this.chartRelationshipId = 'rId3';
      return;
    }

    try {
      let relsXml = await relsFile.async('text');
      
      // Проверяем, есть ли уже связь с изображением
      if (!relsXml.includes('rIdChart')) {
        // Находим максимальный ID для создания уникального
        const existingIds = relsXml.match(/Id="rId(\d+)"/g) || [];
        let maxId = 0;
        existingIds.forEach(id => {
          const num = parseInt(id.match(/\d+/)?.[0] || '0');
          if (num > maxId) maxId = num;
        });
        const newId = `rId${maxId + 1}`;
        
        relsXml = relsXml.replace(
          '</Relationships>',
        )
      }
      // Проверяем, есть ли уже связь с изображением графика
      if (!relsXml.includes('Target="media/chart.png"')) {
        // Находим максимальный ID для создания уникального
        const existingIds = relsXml.match(/Id="rId(\d+)"/g) || [];
        let maxId = 0;
        existingIds.forEach(id => {
          const num = parseInt(id.match(/\d+/)?.[0] || '0');
          if (num > maxId) maxId = num;
        });
        const newId = `rId${maxId + 1}`;
        
        // Добавляем новую связь перед закрывающим тегом
        const newRelationship = `  <Relationship Id="${newId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>`;
        relsXml = relsXml.replace(
          '</Relationships>',
          `${newRelationship}\n</Relationships>`
        );
        
        // Обновляем ID для использования в XML графика
        this.chartRelationshipId = newId;
        
        zip.file(relsPath, relsXml);
        console.log(`Создана связь для изображения с ID: ${newId}`);
      } else {
        // Если связь уже существует, находим её ID
        const existingRelMatch = relsXml.match(/Id="(rId\d+)"[^>]*Target="media\/chart\.png"/);
        if (existingRelMatch) {
          this.chartRelationshipId = existingRelMatch[1];
          console.log(`Найдена существующая связь с ID: ${this.chartRelationshipId}`);
        }
      }
    } catch (error) {
      console.error('Ошибка обновления relationships:', error);
      throw error;
    }
  }

  /**
   * Обновление [Content_Types].xml для поддержки PNG
   */
  private async updateContentTypes(zip: JSZip): Promise<void> {
    try {
      const contentTypesFile = zip.file('[Content_Types].xml');
      
      if (!contentTypesFile) {
        // Создаем новый Content_Types.xml если его нет
        const newContentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
        zip.file('[Content_Types].xml', newContentTypes);
        return;
      }

      let xml = await contentTypesFile.async('text');
      
      // Проверяем и добавляем недостающие типы изображений
      const imagesToAdd = [];
      
      if (!xml.includes('image/png')) {
        imagesToAdd.push('  <Default Extension="png" ContentType="image/png"/>');
      }
      
      if (!xml.includes('image/jpeg')) {
        imagesToAdd.push('  <Default Extension="jpg" ContentType="image/jpeg"/>');
        imagesToAdd.push('  <Default Extension="jpeg" ContentType="image/jpeg"/>');
      }
      
      // Добавляем недостающие типы перед закрывающим тегом </Types>
      if (imagesToAdd.length > 0) {
        xml = xml.replace(
          '</Types>',
          imagesToAdd.join('\n') + '\n</Types>'
        );
        zip.file('[Content_Types].xml', xml);
      }
      
    } catch (error) {
      console.error('Content Types update failed:', error);
    }
  }
}