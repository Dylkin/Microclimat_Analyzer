import html2canvas from 'html2canvas';
import PizZip from 'pizzip';

export interface TemplateReportData {
  title: string;
  date: string;
  dataType: 'temperature' | 'humidity';
  analysisResults: any[];
  conclusions?: string;
  researchObject?: string;
  conditioningSystem?: string;
  testType?: string;
 limits?: any;
  executor?: string;
  testDate?: string;
  reportNo?: string;
}

export class DocxTemplateProcessor {
  private static instance: DocxTemplateProcessor;
  private existingReportBlob: Blob | null = null;

  static getInstance(): DocxTemplateProcessor {
    if (!DocxTemplateProcessor.instance) {
      DocxTemplateProcessor.instance = new DocxTemplateProcessor();
    }
    return DocxTemplateProcessor.instance;
  }

  /**
   * Установка существующего отчета для добавления данных
   */
  setExistingReport(reportBlob: Blob | null): void {
    this.existingReportBlob = reportBlob;
  }

  /**
   * Проверка наличия существующего отчета
   */
  hasExistingReport(): boolean {
    return this.existingReportBlob !== null;
  }

  /**
   * Создание скриншота HTML элемента с поворотом на 90°
   */
  private async createRotatedScreenshot(element: HTMLElement): Promise<ArrayBuffer> {
    // Временно скрываем все кнопки в области графика
    const buttons = element.querySelectorAll('button');
    const originalDisplays: string[] = [];
    buttons.forEach((button, index) => {
      originalDisplays[index] = button.style.display;
      button.style.display = 'none';
    });

    try {
      // Получаем реальные размеры элемента
      const elementRect = element.getBoundingClientRect();
      const originalWidth = elementRect.width;
      const originalHeight = elementRect.height;
      
      console.log('Оригинальные размеры элемента:', { width: originalWidth, height: originalHeight });

      // Создаем скриншот с высоким качеством
      const canvas = await html2canvas(element, {
        scale: 2, // Высокое разрешение
        backgroundColor: '#ffffff', // Белый фон
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: originalWidth,
        height: originalHeight,
        onclone: (clonedDoc) => {
          // Убеждаемся, что в клонированном документе тоже скрыты кнопки
          const clonedButtons = clonedDoc.querySelectorAll('button');
          clonedButtons.forEach(button => {
            button.style.display = 'none';
          });
        }
      });

      // Создаем новый canvas для поворота изображения на 90° против часовой стрелки
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Ошибка создания контекста для поворота изображения');
      }

      // Устанавливаем размеры повернутого canvas
      // После поворота на 90° ширина и высота меняются местами
      const rotatedWidth = canvas.height;
      const rotatedHeight = canvas.width;
      
      rotatedCanvas.width = rotatedWidth;
      rotatedCanvas.height = rotatedHeight;
      
      console.log('Размеры после поворота:', { width: rotatedWidth, height: rotatedHeight });

      // Поворачиваем контекст на 90° против часовой стрелки
      ctx.translate(0, rotatedHeight);
      ctx.rotate(-Math.PI / 2);

      // Рисуем исходное изображение на повернутом canvas
      ctx.drawImage(canvas, 0, 0);

      // Конвертируем в ArrayBuffer
      return new Promise<ArrayBuffer>((resolve, reject) => {
        rotatedCanvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(reject);
          } else {
            reject(new Error('Ошибка создания изображения графика'));
          }
        }, 'image/png', 1.0);
      });

    } finally {
      // Восстанавливаем отображение кнопок
      buttons.forEach((button, index) => {
        button.style.display = originalDisplays[index] || '';
      });
    }
  }

  /**
   * Создание отчета на основе шаблона с PNG изображением
   */
  async processTemplate(
    templateFile: File,
    data: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      if (this.existingReportBlob) {
        console.log('Добавление данных в существующий отчет...');
        return this.appendToExistingReport(templateFile, data, chartElement);
      } else {
        console.log('Создание нового отчета по шаблону с PNG изображением...');
        return this.createNewReport(templateFile, data, chartElement);
      }
    } catch (error) {
      console.error('Ошибка генерации отчета по шаблону:', error);
      
      // Детальная информация об ошибке
      if (error instanceof Error) {
        console.error('Детали ошибки:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      throw new Error(`Не удалось создать отчет по шаблону: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создание нового отчета
   */
  private async createNewReport(
    templateFile: File,
    data: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await templateFile.arrayBuffer();
      
      // Создаем скриншот графика
      console.log('Создаем скриншот графика...');
      const chartImageBuffer = await this.createRotatedScreenshot(chartElement);
      console.log('Скриншот создан, размер:', chartImageBuffer.byteLength, 'байт');

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateBuffer);

      // Читаем основной документ
      const documentXml = zip.files['word/document.xml'].asText();
      
      // Добавляем изображение в папку word/media
      const imageName = 'chart.png';
      const mediaPath = `word/media/${imageName}`;
      
      // Создаем папку media если её нет
      if (!zip.files['word/media/']) {
        zip.folder('word/media');
      }
      
      // Добавляем изображение
      zip.file(mediaPath, chartImageBuffer);
      console.log('Изображение добавлено в:', mediaPath);

      // Генерируем уникальный ID для связи
      const relationshipId = this.generateRelationshipId(zip);
      console.log('Сгенерирован ID связи:', relationshipId);

      // Обновляем файл связей
      this.updateRelationships(zip, relationshipId, `media/${imageName}`);

      // Заменяем плейсхолдер на XML изображения
      const updatedDocumentXml = this.replaceChartPlaceholder(documentXml, relationshipId);
      zip.file('word/document.xml', updatedDocumentXml);

      // Обрабатываем другие плейсхолдеры
      const finalDocumentXml = this.processTextPlaceholders(updatedDocumentXml, data);
      zip.file('word/document.xml', finalDocumentXml);

      // Генерируем итоговый DOCX файл
      console.log('Генерируем итоговый DOCX файл...');
      const buffer = zip.generate({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log('DOCX файл создан успешно, размер:', buffer.size, 'байт');
      
      return buffer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Добавление данных в существующий отчет
   */
  private async appendToExistingReport(
    templateFile: File,
    data: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      // Читаем существующий отчет
      const existingBuffer = await this.existingReportBlob!.arrayBuffer();
      const existingZip = new PizZip(existingBuffer);
      
      // Читаем шаблон для новых данных
      const templateBuffer = await templateFile.arrayBuffer();
      const templateZip = new PizZip(templateBuffer);
      
      // Создаем скриншот нового графика
      console.log('Создаем скриншот нового графика...');
      const chartImageBuffer = await this.createRotatedScreenshot(chartElement);
      
      // Генерируем уникальное имя для нового изображения
      const timestamp = Date.now();
      const newImageName = `chart_${timestamp}.png`;
      const newMediaPath = `word/media/${newImageName}`;
      
      // Добавляем новое изображение в существующий отчет
      existingZip.file(newMediaPath, chartImageBuffer);
      console.log('Новое изображение добавлено:', newMediaPath);
      
      // Генерируем новый ID для связи
      const newRelationshipId = this.generateRelationshipId(existingZip);
      console.log('Сгенерирован новый ID связи:', newRelationshipId);
      
      // Обновляем файл связей в существующем отчете
      this.updateRelationships(existingZip, newRelationshipId, `media/${newImageName}`);
      
      // Читаем содержимое шаблона для получения структуры новых данных
      const templateDocumentXml = templateZip.files['word/document.xml'].asText();
      
      // Обрабатываем шаблон с новыми данными
      let processedTemplateXml = this.replaceChartPlaceholder(templateDocumentXml, newRelationshipId);
      processedTemplateXml = this.processTextPlaceholders(processedTemplateXml, data);
      
      // Читаем существующий документ
      const existingDocumentXml = existingZip.files['word/document.xml'].asText();
      
      // Добавляем новый контент в существующий документ
      const updatedDocumentXml = this.appendContentToDocument(existingDocumentXml, processedTemplateXml);
      
      // Сохраняем обновленный документ
      existingZip.file('word/document.xml', updatedDocumentXml);
      
      // Генерируем обновленный DOCX файл
      console.log('Генерируем обновленный DOCX файл...');
      const buffer = existingZip.generate({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log('Данные успешно добавлены в существующий отчет, размер:', buffer.size, 'байт');
      
      return buffer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Добавление нового контента в существующий документ
   */
  private appendContentToDocument(existingXml: string, newContentXml: string): string {
    try {
      // Извлекаем контент из шаблона (все что между <w:body> и </w:body>)
      const bodyStartTag = '<w:body>';
      const bodyEndTag = '</w:body>';
      
      const newContentStart = newContentXml.indexOf(bodyStartTag);
      const newContentEnd = newContentXml.indexOf(bodyEndTag);
      
      if (newContentStart === -1 || newContentEnd === -1) {
        throw new Error('Не удалось найти тело документа в шаблоне');
      }
      
      // Извлекаем только содержимое body (без тегов)
      const newBodyContent = newContentXml.substring(
        newContentStart + bodyStartTag.length,
        newContentEnd
      );
      
      // Добавляем разделитель страницы и новый контент перед закрывающим тегом body
      const pageBreak = `
        <w:p>
          <w:r>
            <w:br w:type="page"/>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="400" w:after="400"/>
            <w:jc w:val="center"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:sz w:val="32"/>
            </w:rPr>
            <w:t>Дополнительный анализ - ${new Date().toLocaleString('ru-RU')}</w:t>
          </w:r>
        </w:p>`;
      
      // Вставляем новый контент перед закрывающим тегом </w:body>
      const updatedXml = existingXml.replace(
        bodyEndTag,
        pageBreak + newBodyContent + bodyEndTag
      );
      
      return updatedXml;
    } catch (error) {
      console.error('Ошибка добавления контента в документ:', error);
      throw new Error('Не удалось добавить новый контент в существующий документ');
    }
  }

  /**
   * Очистка существующего отчета
   */
  clearExistingReport(): void {
    this.existingReportBlob = null;
  }

  /**
   * Генерация уникального ID для связи
   */
  private generateRelationshipId(zip: PizZip): string {
    const relsPath = 'word/_rels/document.xml.rels';
    let maxId = 0;
    
    if (zip.files[relsPath]) {
      const relsXml = zip.files[relsPath].asText();
      const idMatches = relsXml.match(/Id="rId(\d+)"/g);
      
      if (idMatches) {
        idMatches.forEach(match => {
          const id = parseInt(match.match(/\d+/)?.[0] || '0');
          if (id > maxId) maxId = id;
        });
      }
    }
    
    return `rId${maxId + 1}`;
  }

  /**
   * Обновление файла связей
   */
  private updateRelationships(zip: PizZip, relationshipId: string, imagePath: string): void {
    const relsPath = 'word/_rels/document.xml.rels';
    let relsXml: string;
    
    if (zip.files[relsPath]) {
      relsXml = zip.files[relsPath].asText();
    } else {
      // Создаем базовый файл связей
      relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    }

    // Добавляем новую связь для изображения
    const imageRelationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${imagePath}"/>`;
    
    // Вставляем связь перед закрывающим тегом
    relsXml = relsXml.replace('</Relationships>', `  ${imageRelationship}\n</Relationships>`);
    
    zip.file(relsPath, relsXml);
    console.log('Обновлен файл связей:', relsPath);
  }

  /**
   * Замена плейсхолдера {chart} на XML изображения
   */
  private replaceChartPlaceholder(documentXml: string, relationshipId: string): string {
    // XML структура для вставки изображения
    const imageXml = `<w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="5715000" cy="7620000"/>
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
                      <a:ext cx="5715000" cy="7620000"/>
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

    // Заменяем плейсхолдер на XML изображения
    return documentXml.replace(/{chart}/g, imageXml);
  }

  /**
   * Обработка текстовых плейсхолдеров
   */
  private processTextPlaceholders(documentXml: string, data: TemplateReportData): string {
    console.log('Processing text placeholders, data.testType:', data.testType);
   console.log('Processing text placeholders, data.limits:', data.limits);
   console.log('Processing text placeholders, data.dataType:', data.dataType);
    let result = documentXml;

    // Сначала нормализуем XML, объединяя разбитые плейсхолдеры
    result = this.normalizePlaceholders(result);

    // Обработка плейсхолдера {Result} для выводов
    if (data.conclusions) {
      result = result.replace(/{Result}/g, this.escapeXml(data.conclusions));
    } else {
      result = result.replace(/{Result}/g, '');
    }

    // Обработка плейсхолдера {Object} для объекта исследования
    if (data.researchObject) {
      result = result.replace(/{Object}/g, this.escapeXml(data.researchObject));
    } else {
      result = result.replace(/{Object}/g, '');
    }

    // Обработка плейсхолдера {ConditioningSystem} для климатической установки
    if (data.conditioningSystem) {
      result = result.replace(/{ConditioningSystem}/g, this.escapeXml(data.conditioningSystem));
    } else {
      result = result.replace(/{ConditioningSystem}/g, '');
    }

    // Обработка плейсхолдера {System} для климатической установки (альтернативный)
    if (data.conditioningSystem) {
      result = result.replace(/{System}/g, this.escapeXml(data.conditioningSystem));
    } else {
      result = result.replace(/{System}/g, '');
    }

    // Обработка плейсхолдера {NameTest} для типа испытания
    if (data.testType) {
      console.log('Replacing {NameTest} with:', data.testType);
      result = result.replace(/{NameTest}/g, this.escapeXml(data.testType));
    } else {
      console.log('testType is empty or undefined:', data.testType, 'replacing {NameTest} with empty string');
      result = result.replace(/{NameTest}/g, '');
    }

   // Обработка плейсхолдера {Limits} для лимитов
   const limitsText = this.formatLimitsText(data.limits, data.dataType);
   console.log('Replacing {Limits} with:', limitsText);
   result = result.replace(/{Limits}/g, this.escapeXml(limitsText));

    // Обработка плейсхолдера {Executor} для исполнителя
    if (data.executor) {
      console.log('Replacing {Executor} with:', data.executor);
      result = result.replace(/{Executor}/g, this.escapeXml(data.executor));
    } else {
      console.log('executor is empty or undefined:', data.executor, 'replacing {Executor} with empty string');
      result = result.replace(/{Executor}/g, '');
    }
    
    // Обработка плейсхолдера {TestDate} для даты испытания
    if (data.testDate) {
      console.log('Replacing {TestDate} with:', data.testDate);
      result = result.replace(/{TestDate}/g, this.escapeXml(data.testDate));
    } else {
      console.log('testDate is empty or undefined:', data.testDate, 'replacing {TestDate} with empty string');
      result = result.replace(/{TestDate}/g, '');
    }
    
    // Обработка плейсхолдера {ReportNo} для номера договора
    if (data.reportNo) {
      console.log('Replacing {ReportNo} with:', data.reportNo);
      result = result.replace(/{ReportNo}/g, this.escapeXml(data.reportNo));
    } else {
      console.log('reportNo is empty or undefined:', data.reportNo, 'replacing {ReportNo} with empty string');
      result = result.replace(/{ReportNo}/g, '');
    }
    
    // Обработка плейсхолдера таблицы результатов
    result = this.processTablePlaceholder(result, data);
    
    console.log('Final result after placeholder processing contains {NameTest}:', result.includes('{NameTest}'));
   console.log('Final result after placeholder processing contains {Limits}:', result.includes('{Limits}'));
    console.log('Final result after placeholder processing contains {Executor}:', result.includes('{Executor}'));
    console.log('Final result after placeholder processing contains {TestDate}:', result.includes('{TestDate}'));
    console.log('Final result after placeholder processing contains {ReportNo}:', result.includes('{ReportNo}'));
    return result;
  }

  /**
   * Нормализация плейсхолдеров - объединение разбитых плейсхолдеров
   */
  private normalizePlaceholders(xml: string): string {
    // Список плейсхолдеров для нормализации
    const placeholders = [
      'Result', 'Object', 'ConditioningSystem', 'System', 'NameTest', 'chart', 'resultsTable', 'Limits', 'Executor', 'TestDate', 'ReportNo'
    ];
    
    let result = xml;
    
    placeholders.forEach(placeholder => {
      // Регулярное выражение для поиска разбитых плейсхолдеров
      // Ищем {, затем любые XML теги, затем части плейсхолдера, затем }
      const regex = new RegExp(
        `\\{(?:<[^>]*>)*${placeholder.split('').map(char => 
          `${char}(?:<[^>]*>)*`
        ).join('')}(?:<[^>]*>)*\\}`,
        'gi'
      );
      
      result = result.replace(regex, `{${placeholder}}`);
    });
    
    return result;
  }

  /**
   * Обработка плейсхолдера {resultsTable} для вставки таблицы результатов анализа
   */
  private processTablePlaceholder(documentXml: string, data: TemplateReportData): string {
    // Проверяем наличие плейсхолдера {resultsTable}
    if (!documentXml.includes('{resultsTable}')) {
      return documentXml;
    }

    // Создаем XML структуру таблицы
    const tableXml = this.createResultsTableXml(data.analysisResults, data.dataType);
    
    // Заменяем плейсхолдер на таблицу
    return documentXml.replace(/{resultsTable}/g, tableXml);
  }

  /**
   * Создание XML структуры таблицы результатов анализа
   */
  private createResultsTableXml(results: any[], dataType: 'temperature' | 'humidity'): string {
    // Заголовок таблицы
    const headerRow = `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>№ зоны</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Уровень (м.)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Логгер</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Серийный №</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Мин. t°C</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Макс. t°C</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Среднее t°C</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>Соответствие</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>`;

    // Строки данных
    const dataRows = results.map(result => {
      // Определяем цвет фона для соответствия лимитам
      const complianceColor = result.meetsLimits === 'Да' ? 'C6EFCE' : 
                             result.meetsLimits === 'Нет' ? 'FFC7CE' : 'FFFFFF';
      
      return `
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.zoneNumber.toString())}</w:t></w:r>
            </w:p>
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.measurementLevel.toString())}</w:t></w:r>
            </w:p>
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.loggerName)}</w:t></w:r>
            </w:p>
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.serialNumber)}</w:t></w:r>
            </w:p>
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.minTemp.toString())}</w:t></w:r>
            </w:p>
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.maxTemp.toString())}</w:t></w:r>
            </w:p>
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
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.avgTemp.toString())}</w:t></w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              </w:tcBorders>
              <w:shd w:val="clear" w:color="auto" w:fill="${complianceColor}"/>
            </w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${this.escapeXml(result.meetsLimits)}</w:t></w:r>
            </w:p>
          </w:tc>
        </w:tr>`;
    }).join('');

    // Полная структура таблицы
    return `
      <w:tbl>
        <w:tblPr>
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
        <w:tblGrid>
          <w:gridCol w:w="1000"/>
          <w:gridCol w:w="1200"/>
          <w:gridCol w:w="1000"/>
          <w:gridCol w:w="1200"/>
          <w:gridCol w:w="1000"/>
          <w:gridCol w:w="1000"/>
          <w:gridCol w:w="1000"/>
          <w:gridCol w:w="1200"/>
        </w:tblGrid>
        ${headerRow}
        ${dataRows}
      </w:tbl>`;
  }

  /**
   * Форматирование текста лимитов для вставки в документ
   */
  private formatLimitsText(limits: any, dataType: 'temperature' | 'humidity'): string {
    if (!limits || !limits[dataType]) {
      return 'Лимиты не установлены';
    }

    const currentLimits = limits[dataType];
    const unit = dataType === 'temperature' ? '°C' : '%';
    const dataTypeName = dataType === 'temperature' ? 'Температура' : 'Влажность';
    
    const parts: string[] = [];
    
    if (currentLimits.min !== undefined && currentLimits.max !== undefined) {
      parts.push(`${dataTypeName}: от ${currentLimits.min}${unit} до ${currentLimits.max}${unit}`);
    } else if (currentLimits.min !== undefined) {
      parts.push(`${dataTypeName}: минимум ${currentLimits.min}${unit}`);
    } else if (currentLimits.max !== undefined) {
      parts.push(`${dataTypeName}: максимум ${currentLimits.max}${unit}`);
    } else {
      return 'Лимиты не установлены';
    }
    
    return parts.join(', ');
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
   * Валидация DOCX шаблона
   */
  async validateTemplate(templateFile: File): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Проверяем расширение файла
      if (!templateFile.name.toLowerCase().endsWith('.docx')) {
        return {
          isValid: false,
          errors: ['Файл должен иметь расширение .docx']
        };
      }

      // Читаем файл как ArrayBuffer
      const buffer = await templateFile.arrayBuffer();
      
      // Проверяем, что это валидный ZIP архив (DOCX)
      try {
        const zip = new PizZip(buffer);
        
        // Проверяем наличие основных файлов DOCX
        if (!zip.files['word/document.xml']) {
          return {
            isValid: false,
            errors: ['Файл не является корректным DOCX документом']
          };
        }

        // Читаем содержимое документа
        const documentXml = zip.files['word/document.xml'].asText();
        
        return {
          isValid: true,
          errors: []
        };

      } catch (zipError) {
        return {
          isValid: false,
          errors: ['Не удалось прочитать DOCX файл. Возможно, файл поврежден.']
        };
      }

    } catch (error) {
      console.error('Ошибка валидации шаблона:', error);
      return {
        isValid: false,
        errors: ['Ошибка при проверке файла шаблона']
      };
    }
  }
}