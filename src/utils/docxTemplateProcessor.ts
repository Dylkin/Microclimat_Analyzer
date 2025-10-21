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
  reportDate?: string;
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
      console.log('📄 Чтение файла шаблона:', templateFile.name);
      console.log('  - Размер файла:', templateFile.size, 'байт');
      console.log('  - Тип файла:', templateFile.type);
      console.log('  - Дата изменения:', templateFile.lastModified);
      
      // Проверяем, что файл доступен для чтения
      if (!templateFile || templateFile.size === 0) {
        throw new Error('Файл шаблона пустой или недоступен');
      }
      
      // Читаем шаблон как ArrayBuffer
      console.log('🔄 Начинаем чтение файла шаблона...');
      let templateBuffer: ArrayBuffer;
      try {
        templateBuffer = await templateFile.arrayBuffer();
        console.log('✅ Файл шаблона успешно прочитан, размер буфера:', templateBuffer.byteLength, 'байт');
      } catch (readError) {
        console.error('❌ Ошибка чтения файла шаблона:', readError);
        throw new Error(`Не удалось прочитать файл шаблона "${templateFile.name}". Возможно, файл был удален, перемещен или у приложения нет прав на чтение. Попробуйте загрузить шаблон заново.`);
      }
      
      // Создаем скриншот графика
      console.log('Создаем скриншот графика...');
      const chartImageBuffer = await this.createRotatedScreenshot(chartElement);
      console.log('Скриншот создан, размер:', chartImageBuffer.byteLength, 'байт');

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateBuffer);

      // Читаем основной документ
      const documentXml = zip.files['word/document.xml'].asText();
      
      // Диагностика: проверяем содержимое документа сразу после загрузки
      console.log('Document loaded, XML length:', documentXml.length);
      const hasTableOnLoad = documentXml.includes('{Table}');
      console.log('{Table} exists on document load:', hasTableOnLoad);
      
      // Найдем все плейсхолдеры в загруженном документе
      const placeholderRegex = /\{[^}]+\}/g;
      const initialPlaceholders = documentXml.match(placeholderRegex) || [];
      console.log('Initial placeholders in loaded document:', initialPlaceholders);
      
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
      
      // Проверяем, что плейсхолдер был заменен
      if (updatedDocumentXml.includes('{chart}')) {
        console.warn('Плейсхолдер {chart} не был полностью заменен');
      } else {
        console.log('Плейсхолдер {chart} успешно заменен на XML изображения');
      }
      
      // Проверяем, что другие плейсхолдеры не пострадали
      const hasTableAfterChart = updatedDocumentXml.includes('{Table}');
      console.log('{Table} placeholder exists after chart replacement:', hasTableAfterChart);
      
      zip.file('word/document.xml', updatedDocumentXml);

      // Обрабатываем другие плейсхолдеры
      const finalDocumentXml = this.processTextPlaceholders(updatedDocumentXml, data);
      zip.file('word/document.xml', finalDocumentXml);

      // Обрабатываем плейсхолдеры в колонтитулах
      this.processHeaderFooterPlaceholders(zip, data);

      // Валидация DOCX структуры
      console.log('Валидация DOCX структуры...');
      const validationErrors = this.validateDocxStructure(zip.files);
      if (validationErrors.length > 0) {
        console.warn('DOCX validation errors:', validationErrors);
        // Не прерываем выполнение, но логируем ошибки
      } else {
        console.log('DOCX structure validation passed');
      }

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
   * Добавление полного отчета в конец существующего документа
   */
  async appendFullReportToExisting(
    existingReportBlob: Blob,
    newReportBlob: Blob
  ): Promise<Blob> {
    try {
      console.log('Добавляем полный отчет в конец существующего документа...');
      
      // Загружаем существующий отчет
      const existingZip = new PizZip(await existingReportBlob.arrayBuffer());
      const existingDocumentXml = existingZip.files['word/document.xml'].asText();
      
      // Загружаем новый отчет
      const newZip = new PizZip(await newReportBlob.arrayBuffer());
      const newDocumentXml = newZip.files['word/document.xml'].asText();
      
      // Извлекаем содержимое body из нового отчета
      const newBodyContent = this.extractBodyContent(newDocumentXml);
      
      // Проверяем, что в новом отчете нет необработанных плейсхолдеров
      const unprocessedPlaceholders = this.findUnprocessedPlaceholders(newBodyContent);
      if (unprocessedPlaceholders.length > 0) {
        console.warn('Обнаружены необработанные плейсхолдеры в новом отчете:', unprocessedPlaceholders);
        console.warn('Содержимое нового отчета:', newBodyContent.substring(0, 500) + '...');
      }
      
      // Проверяем на наличие нежелательного текста
      if (newBodyContent.includes('Дополнительный анализ')) {
        console.warn('Обнаружен нежелательный текст "Дополнительный анализ" в новом отчете');
        console.warn('Содержимое нового отчета:', newBodyContent.substring(0, 1000) + '...');
      }
      
      // Добавляем содержимое нового отчета в конец существующего
      const updatedDocumentXml = this.appendBodyContentToDocument(existingDocumentXml, newBodyContent);
      
      // Обновляем document.xml в существующем файле
      existingZip.file('word/document.xml', updatedDocumentXml);
      
      // Копируем медиафайлы из нового отчета в существующий
      await this.copyMediaFiles(newZip, existingZip);
      
      // Генерируем обновленный DOCX файл
      const buffer = existingZip.generate({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log('Полный отчет успешно добавлен в конец существующего документа');
      return buffer;
      
    } catch (error) {
      console.error('Ошибка при добавлении полного отчета:', error);
      throw error;
    }
  }

  /**
   * Извлечение содержимого body из XML документа
   */
  private extractBodyContent(documentXml: string): string {
    const bodyStart = documentXml.indexOf('<w:body>');
    const bodyEnd = documentXml.lastIndexOf('</w:body>');
    
    if (bodyStart === -1 || bodyEnd === -1) {
      throw new Error('Не удалось найти теги body в документе');
    }
    
    return documentXml.substring(bodyStart + 8, bodyEnd);
  }

  /**
   * Добавление содержимого body в конец документа
   */
  private appendBodyContentToDocument(documentXml: string, bodyContent: string): string {
    const bodyEndIndex = documentXml.lastIndexOf('</w:body>');
    if (bodyEndIndex === -1) {
      throw new Error('Не удалось найти закрывающий тег body в документе');
    }
    
    const beforeBody = documentXml.substring(0, bodyEndIndex);
    const afterBody = documentXml.substring(bodyEndIndex);
    
    return beforeBody + bodyContent + afterBody;
  }

  /**
   * Поиск необработанных плейсхолдеров в содержимом
   */
  private findUnprocessedPlaceholders(content: string): string[] {
    const placeholderPattern = /\{[^}]+\}/g;
    const matches = content.match(placeholderPattern);
    return matches || [];
  }

  /**
   * Копирование медиафайлов из нового отчета в существующий
   */
  private async copyMediaFiles(sourceZip: any, targetZip: any): Promise<void> {
    try {
      // Получаем список всех файлов в исходном архиве
      const sourceFiles = Object.keys(sourceZip.files);
      
      // Копируем медиафайлы
      for (const fileName of sourceFiles) {
        if (fileName.startsWith('word/media/')) {
          const file = sourceZip.files[fileName];
          if (file && !file.dir) {
            // Генерируем уникальное имя файла
            const timestamp = Date.now();
            const fileExtension = fileName.split('.').pop();
            const newFileName = `word/media/image_${timestamp}.${fileExtension}`;
            
            // Копируем файл
            targetZip.file(newFileName, file.asArrayBuffer());
            console.log(`Скопирован медиафайл: ${fileName} -> ${newFileName}`);
          }
        }
      }
      
      console.log('Медиафайлы успешно скопированы');
    } catch (error) {
      console.error('Ошибка при копировании медиафайлов:', error);
      throw error;
    }
  }

  /**
   * Создание нового отчета с дополнительным контентом из предыдущих данных
   */
  async createNewReportWithAppendedContent(
    templateFile: File,
    newData: TemplateReportData,
    chartElement: HTMLElement,
    previousReportData: any
  ): Promise<Blob> {
    try {
      console.log('Создаем новый отчет с дополнительным контентом...');
      
      // Сначала создаем обычный новый отчет
      const newReportBlob = await this.processTemplate(templateFile, newData, chartElement);
      
      // Если есть предыдущие данные, добавляем их в конец
      if (previousReportData && previousReportData.analysisResults) {
        console.log('Добавляем данные из предыдущего отчета...');
        
        // Загружаем созданный отчет
        const zip = new PizZip(await newReportBlob.arrayBuffer());
        const documentXml = zip.files['word/document.xml'].asText();
        
        // Создаем дополнительный контент из предыдущих данных
        const additionalContent = await this.createAdditionalContentFromPreviousData(previousReportData);
        
        // Добавляем дополнительный контент в конец документа
        const updatedDocumentXml = this.appendContentToDocument(documentXml, additionalContent);
        
        // Обновляем document.xml
        zip.file('word/document.xml', updatedDocumentXml);
        
        // Генерируем обновленный DOCX файл
        const buffer = zip.generate({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        console.log('Новый отчет с дополнительным контентом создан успешно');
        return buffer;
      }
      
      return newReportBlob;
      
    } catch (error) {
      console.error('Ошибка при создании нового отчета с дополнительным контентом:', error);
      throw error;
    }
  }

  /**
   * Создание дополнительного контента из предыдущих данных
   */
  private async createAdditionalContentFromPreviousData(previousData: any): Promise<string> {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU');
    const timeStr = now.toLocaleTimeString('ru-RU');
    
    // Создаем заголовок для дополнительного раздела
    const sectionHeader = `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
          <w:spacing w:before="240" w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="28"/>
            <w:szCs w:val="28"/>
          </w:rPr>
          <w:t>Предыдущий анализ (${dateStr} ${timeStr})</w:t>
        </w:r>
      </w:p>`;

    // Создаем таблицу из предыдущих данных
    const previousTable = this.createResultsTableXml(previousData.analysisResults, previousData.dataType);
    
    // Создаем выводы если есть
    let previousConclusions = '';
    if (previousData.conclusions && previousData.conclusions.trim()) {
      previousConclusions = `
        <w:p>
          <w:pPr>
            <w:spacing w:before="240" w:after="120"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>Предыдущие выводы:</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="0" w:after="240"/>
          </w:pPr>
          <w:r>
            <w:t>${this.escapeXml(previousData.conclusions)}</w:t>
          </w:r>
        </w:p>`;
    }

    return sectionHeader + previousTable + previousConclusions;
  }

  /**
   * Добавление данных в конец существующего DOCX файла
   */
  async appendToExistingDocx(
    existingDocxBlob: Blob,
    newData: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      console.log('Добавляем данные в существующий DOCX файл...');
      
      // Загружаем существующий DOCX файл
      const existingZip = new PizZip(await existingDocxBlob.arrayBuffer());
      
      // Создаем скриншот нового графика
      console.log('Создаем скриншот нового графика...');
      const chartImage = await this.createRotatedScreenshot(chartElement);
      
      // Добавляем новое изображение в существующий файл
      const imageId = `chart_${Date.now()}`;
      const imageFilename = `word/media/${imageId}.png`;
      existingZip.file(imageFilename, chartImage);
      
      // Получаем текущий document.xml
      const currentDocumentXml = existingZip.files['word/document.xml'].asText();
      
      // Создаем новый контент для добавления
      const newContent = await this.createNewContent(newData, imageId);
      
      // Добавляем новый контент в конец документа
      const updatedDocumentXml = this.appendContentToDocument(currentDocumentXml, newContent);
      
      // Обновляем document.xml
      existingZip.file('word/document.xml', updatedDocumentXml);
      
      // Обновляем связи
      await this.updateDocumentRelations(existingZip, imageId);
      
      // Генерируем обновленный DOCX файл
      const buffer = existingZip.generate({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log('DOCX файл обновлен успешно, размер:', buffer.size, 'байт');
      return buffer;
      
    } catch (error) {
      console.error('Ошибка при добавлении в существующий DOCX:', error);
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
      
      // Обрабатываем плейсхолдеры в колонтитулах
      this.processHeaderFooterPlaceholders(existingZip, data);
      
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
      // Создаем папку _rels если её нет
      if (!zip.files['word/_rels/']) {
        zip.folder('word/_rels');
      }
      
      relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    }

    // Добавляем новую связь для изображения
    const imageRelationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${imagePath}"/>`;
    
    // Вставляем связь перед закрывающим тегом
    relsXml = relsXml.replace('</Relationships>', `  ${imageRelationship}\n</Relationships>`);
    
    zip.file(relsPath, relsXml);
    console.log('Обновлен файл связей:', relsPath, 'с ID:', relationshipId);
  }

  /**
   * Замена плейсхолдера {chart} на XML изображения
   */
  private replaceChartPlaceholder(documentXml: string, relationshipId: string): string {
    // Более простая и надежная XML структура для вставки изображения
    const imageXml = `<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
  </w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0" 
                 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:extent cx="5715000" cy="7620000"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="1" name="Chart" descr="Chart Image"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="Chart"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relationshipId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
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

    // Более надежная замена плейсхолдера с учетом возможных разрывов в XML
    let result = documentXml;
    
    // Диагностика: проверяем наличие {Table} до нормализации
    const hasTableBefore = result.includes('{Table}');
    console.log('{Table} exists before chart replacement:', hasTableBefore);
    
    // Сначала нормализуем возможные разбитые плейсхолдеры
    result = this.normalizePlaceholders(result);
    
    // Диагностика: проверяем наличие {Table} после нормализации
    const hasTableAfterNormalization = result.includes('{Table}');
    console.log('{Table} exists after normalization:', hasTableAfterNormalization);
    
    // Заменяем плейсхолдер на XML изображения
    result = result.replace(/{chart}/g, imageXml);
    
    // Диагностика: проверяем наличие {Table} после замены chart
    const hasTableAfterChart = result.includes('{Table}');
    console.log('{Table} exists after chart replacement:', hasTableAfterChart);
    
    console.log('Плейсхолдер {chart} заменен на XML изображения');
    return result;
  }

  /**
   * Обработка текстовых плейсхолдеров
   */
  private processTextPlaceholders(documentXml: string, data: TemplateReportData): string {
    console.log('Processing text placeholders, data.testType:', data.testType);
   console.log('Processing text placeholders, data.limits:', data.limits);
   console.log('Processing text placeholders, data.dataType:', data.dataType);
    let result = documentXml;

    // Диагностика: найдем все плейсхолдеры в документе до обработки
    const placeholderRegex = /\{[^}]+\}/g;
    const initialPlaceholders = documentXml.match(placeholderRegex) || [];
    console.log('Initial placeholders in document:', initialPlaceholders);

    // Сначала нормализуем XML, объединяя разбитые плейсхолдеры
    result = this.normalizePlaceholders(result);
    
    // Диагностика: найдем все плейсхолдеры после нормализации
    const normalizedPlaceholders = result.match(placeholderRegex) || [];
    console.log('Placeholders after normalization:', normalizedPlaceholders);

    // Обработка плейсхолдера {Result} для выводов
    if (data.conclusions) {
      result = result.replace(/{Result}/g, this.escapeXml(data.conclusions));
    } else {
      result = result.replace(/{Result}/g, '');
    }

    // Обработка плейсхолдера {Object} для наименования объекта квалификации
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
    
    // Обработка плейсхолдера {TestDate} для даты испытания (только дата без времени)
    if (data.testDate) {
      console.log('🔍 DEBUG TestDate processing:');
      console.log('  - Original data.testDate:', data.testDate);
      console.log('  - data.testDate type:', typeof data.testDate);
      console.log('  - data.testDate length:', data.testDate.length);
      
      // Убеждаемся, что передается только дата без времени
      let dateOnly = data.testDate;
      
      // Если testDate содержит время, извлекаем только дату
      if (dateOnly.includes(' ')) {
        dateOnly = dateOnly.split(' ')[0];
      }
      
      // Если это ISO строка, конвертируем в локальную дату
      if (dateOnly.includes('T') || dateOnly.includes('-')) {
        try {
          const date = new Date(dateOnly);
          if (!isNaN(date.getTime())) {
            dateOnly = date.toLocaleDateString('ru-RU');
          }
        } catch (error) {
          console.warn('Ошибка парсинга даты:', error);
        }
      }
      
      console.log('  - Final dateOnly:', dateOnly);
      console.log('  - dateOnly type:', typeof dateOnly);
      console.log('  - dateOnly length:', dateOnly.length);
      console.log('Replacing {TestDate} with date only:', dateOnly);
      result = result.replace(/{TestDate}/g, this.escapeXml(dateOnly));
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
    
    // Обработка плейсхолдера {ReportDate} для даты договора
    if (data.reportDate) {
      console.log('Replacing {ReportDate} with:', data.reportDate);
      result = result.replace(/{ReportDate}/g, this.escapeXml(data.reportDate));
    } else {
      console.log('reportDate is empty or undefined:', data.reportDate, 'replacing {ReportDate} with empty string');
      result = result.replace(/{ReportDate}/g, '');
    }
    
    // Обработка плейсхолдера {title} для заголовка отчета
    if (data.title) {
      console.log('Replacing {title} with:', data.title);
      result = result.replace(/{title}/g, this.escapeXml(data.title));
    } else {
      console.log('title is empty or undefined:', data.title, 'replacing {title} with empty string');
      result = result.replace(/{title}/g, '');
    }
    
    // Обработка плейсхолдера {date} для даты создания отчета
    if (data.date) {
      console.log('Replacing {date} with:', data.date);
      result = result.replace(/{date}/g, this.escapeXml(data.date));
    } else {
      console.log('date is empty or undefined:', data.date, 'replacing {date} with empty string');
      result = result.replace(/{date}/g, '');
    }
    
    // Исправляем неправильные плейсхолдеры с двойными скобками перед обработкой
    result = result.replace(/\{\{Table\}\}/g, '{Table}');
    result = result.replace(/\{\{Table\}/g, '{Table}');
    result = result.replace(/\{Table\}\}/g, '{Table}');
    
    // Обработка плейсхолдера {Table}
    result = this.processTablePlaceholder(result, data);
    
    console.log('Final result after placeholder processing contains {NameTest}:', result.includes('{NameTest}'));
   console.log('Final result after placeholder processing contains {Limits}:', result.includes('{Limits}'));
    console.log('Final result after placeholder processing contains {Executor}:', result.includes('{Executor}'));
    console.log('Final result after placeholder processing contains {TestDate}:', result.includes('{TestDate}'));
    console.log('Final result after placeholder processing contains {ReportNo}:', result.includes('{ReportNo}'));
    console.log('Final result after placeholder processing contains {ReportDate}:', result.includes('{ReportDate}'));
    
    // Финальная проверка XML валидности
    if (result.includes('&')) {
      const unescapedAmpersands = result.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
      if (unescapedAmpersands && unescapedAmpersands.length > 0) {
        console.warn('Final XML contains unescaped ampersands:', unescapedAmpersands);
        // Исправляем неэкранированные амперсанды
        result = result.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
        console.log('Fixed unescaped ampersands in final XML');
      }
    }
    
    return result;
  }

  /**
   * Нормализация плейсхолдеров - исправление поврежденных плейсхолдеров
   */
  private normalizePlaceholders(xml: string): string {
    console.log('Starting placeholder normalization...');
    
    let result = xml;
    
    // 1. Исправляем поврежденные плейсхолдеры с XML тегами
    // Удаляем XML теги вокруг плейсхолдеров
    result = result.replace(
      /<w:t[^>]*>(\s*{([^}]+)}\s*)<\/w:t>/g, 
      '<w:t>{$2}</w:t>'
    );
    
    // 2. Исправляем плейсхолдеры, разбитые XML тегами
    const placeholders = [
      'Result', 'Object', 'ConditioningSystem', 'System', 'NameTest', 'chart', 'Table', 'Limits', 'Executor', 'TestDate', 'ReportNo', 'ReportDate', 'title', 'date'
    ];
    
    placeholders.forEach(placeholder => {
      // Ищем плейсхолдеры, разбитые XML тегами
      const brokenPattern = new RegExp(
        `\\{[^}]*${placeholder.split('').map(char => 
          `${char}(?:<[^>]*>)*`
        ).join('')}(?:<[^>]*>)*[^}]*\\}`,
        'gi'
      );
      result = result.replace(brokenPattern, `{${placeholder}}`);
      
      // Ищем простые разбитые плейсхолдеры
      const simplePattern = new RegExp(`\\{[^}]*${placeholder}[^}]*\\}`, 'gi');
      result = result.replace(simplePattern, `{${placeholder}}`);
    });
    
    // 3. Специальная обработка для Table
    // Ищем случаи, где Table может быть в XML тегах без фигурных скобок
    const tableInXml = /<w:t[^>]*>Table<\/w:t>/gi;
    result = result.replace(tableInXml, '<w:t>{Table}</w:t>');
    
    // Ищем случаи, где Table может быть просто "Table" без фигурных скобок
    const tableNoBrackets = /(?<!\{)Table(?!\})/gi;
    result = result.replace(tableNoBrackets, '{Table}');
    
    // 4. Исправляем двойные скобки
    result = result.replace(/\{\{([^}]+)\}\}/g, '{$1}');
    result = result.replace(/\{\{([^}]+)\}/g, '{$1}');
    result = result.replace(/\{([^}]+)\}\}/g, '{$1}');
    
    // 5. Очищаем пробелы вокруг плейсхолдеров
    result = result.replace(/\{\s+([^}]+)\s+\}/g, '{$1}');
    
    console.log('Placeholder normalization completed');
    return result;
  }

  /**
   * Обработка плейсхолдера {Table} для вставки таблицы результатов анализа
   */
  private processTablePlaceholder(documentXml: string, data: TemplateReportData): string {
    console.log('Processing {Table} placeholder...');
    console.log('Document contains {Table}:', documentXml.includes('{Table}'));
    console.log('Analysis results count:', data.analysisResults?.length || 0);
    
    // Диагностика: найдем все плейсхолдеры в документе
    const placeholderRegex = /\{[^}]+\}/g;
    const foundPlaceholders = documentXml.match(placeholderRegex) || [];
    console.log('Found placeholders in document:', foundPlaceholders);
    
    // Проверяем наличие плейсхолдера {Table} (включая разбитые варианты)
    let hasTable = documentXml.includes('{Table}');

    // Если не найден, попробуем найти разбитые варианты
    if (!hasTable) {
      // Ищем разбитые плейсхолдеры
      const tableVariants = [
        '{Table}',
        'Table'
      ];

      for (const variant of tableVariants) {
        if (documentXml.includes(variant)) {
          console.log(`Found potential Table variant: ${variant}`);
          hasTable = true;
          break;
        }
      }

      // Также проверим, есть ли части плейсхолдера в разных местах
      const hasTableText = documentXml.includes('Table');
      console.log('Contains "Table":', hasTableText);
    }

    if (!hasTable) {
      console.log('{Table} placeholder not found in document');
      console.log('Available placeholders:', foundPlaceholders);

      // Дополнительная диагностика: покажем фрагменты документа, содержащие "Table"
      const tableMatches = documentXml.match(/[^<]*Table[^<]*/gi) || [];
      console.log('Document fragments containing "Table":', tableMatches.slice(0, 5));

      return documentXml;
    }

    // Создаем XML структуру таблицы
    const tableXml = this.createResultsTableXml(data.analysisResults, data.dataType);
    console.log('Generated table XML length:', tableXml.length);
    console.log('Table XML preview:', tableXml.substring(0, 200) + '...');
    
    // Заменяем плейсхолдер на таблицу
    const result = documentXml.replace(/{Table}/g, tableXml);
    console.log('{Table} placeholder replaced successfully');
    
    // Проверяем, что XML валиден
    if (result.includes('&')) {
      console.warn('XML contains ampersands, checking for unescaped ones...');
      // Проверяем наличие неэкранированных амперсандов
      const unescapedAmpersands = result.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
      if (unescapedAmpersands && unescapedAmpersands.length > 0) {
        console.warn('Found unescaped ampersands:', unescapedAmpersands);
        // Исправляем неэкранированные амперсанды
        const fixedResult = result.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
        console.log('Fixed unescaped ampersands');
        return fixedResult;
      } else {
        console.log('All ampersands are properly escaped');
      }
    }
    
    return result;
  }

  /**
   * Создание XML структуры таблицы результатов анализа
   */
  public createResultsTableXml(results: any[], dataType: 'temperature' | 'humidity'): string {
    console.log('Creating results table XML...');
    console.log('Results count:', results?.length || 0);
    console.log('DataType:', dataType);
    console.log('Results data:', results);
    
    if (!results || results.length === 0) {
      console.log('No results to create table');
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }
    
    // Находим глобальные минимальные и максимальные значения (исключая внешние датчики)
    const nonExternalResults = results.filter(result => !result.isExternal);
    console.log('Non-external results count:', nonExternalResults.length);
    
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;
    
    console.log('Global min temp:', globalMinTemp);
    console.log('Global max temp:', globalMaxTemp);

    // Функция для экранирования XML символов
    const escapeXml = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/°C/g, '&#176;C') // Специальная обработка для °C
        .replace(/\u00B0/g, '&#176;'); // Символ градуса
    };

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
      
      // Определяем цвета для минимальных и максимальных значений
      const minTempValue = parseFloat(result.minTemp);
      const maxTempValue = parseFloat(result.maxTemp);
      
      const minTempColor = (!result.isExternal && !isNaN(minTempValue) && 
                          globalMinTemp !== null && minTempValue === globalMinTemp) ? 
                          'ADD8E6' : 'FFFFFF'; // Светло-голубой для минимума
      
      const maxTempColor = (!result.isExternal && !isNaN(maxTempValue) && 
                          globalMaxTemp !== null && maxTempValue === globalMaxTemp) ? 
                          'FFB6C1' : 'FFFFFF'; // Светло-розовый для максимума

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
              <w:r><w:t>${escapeXml(result.zoneNumber.toString() === '0' ? 'Внешний' : result.zoneNumber.toString())}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ','))}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(result.loggerName)}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(result.serialNumber)}</w:t></w:r>
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
              <w:shd w:val="clear" w:color="auto" w:fill="${minTempColor}"/>
            </w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${escapeXml(result.minTemp.toString())}</w:t></w:r>
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
              <w:shd w:val="clear" w:color="auto" w:fill="${maxTempColor}"/>
            </w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/></w:pPr>
              <w:r><w:t>${escapeXml(result.maxTemp.toString())}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(result.avgTemp.toString())}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(result.meetsLimits)}</w:t></w:r>
            </w:p>
          </w:tc>
        </w:tr>`;
    }).join('');

    // Полная структура таблицы
    const fullTableXml = `
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
          <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2000"/>
        </w:tblGrid>
        ${headerRow}
        ${dataRows}
      </w:tbl>`;
    
    console.log('Generated full table XML length:', fullTableXml.length);
    console.log('Table XML ends with:', fullTableXml.substring(fullTableXml.length - 100));
    
    // Дополнительная проверка XML валидности
    if (fullTableXml.includes('&')) {
      const unescapedAmpersands = fullTableXml.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
      if (unescapedAmpersands && unescapedAmpersands.length > 0) {
        console.warn('Table XML contains unescaped ampersands:', unescapedAmpersands);
        // Исправляем неэкранированные амперсанды
        const fixedXml = fullTableXml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
        console.log('Fixed unescaped ampersands in table XML');
        return fixedXml;
      }
    }
    
    return fullTableXml;
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
   * Обработка плейсхолдеров в колонтитулах
   */
  private processHeaderFooterPlaceholders(zip: PizZip, data: TemplateReportData): void {
    try {
      console.log('Обработка плейсхолдеров в колонтитулах...');
      
      // Список возможных файлов колонтитулов
      const headerFooterFiles = [
        'word/header1.xml',
        'word/header2.xml', 
        'word/header3.xml',
        'word/footer1.xml',
        'word/footer2.xml',
        'word/footer3.xml'
      ];
      
      let processedCount = 0;
      
      headerFooterFiles.forEach(fileName => {
        if (zip.files[fileName]) {
          console.log(`Обрабатываем файл колонтитула: ${fileName}`);
          
          try {
            // Читаем содержимое файла колонтитула
            const headerFooterXml = zip.files[fileName].asText();
            
            // Обрабатываем плейсхолдеры
            const processedXml = this.processTextPlaceholders(headerFooterXml, data);
            
            // Сохраняем обновленный файл
            zip.file(fileName, processedXml);
            processedCount++;
            
            console.log(`Файл ${fileName} успешно обработан`);
          } catch (error) {
            console.warn(`Ошибка обработки файла ${fileName}:`, error);
          }
        }
      });
      
      console.log(`Обработано файлов колонтитулов: ${processedCount}`);
      
    } catch (error) {
      console.error('Ошибка обработки колонтитулов:', error);
      // Не прерываем выполнение, так как это не критическая ошибка
    }
  }

  /**
   * Экранирование XML символов
   */
  public escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/°C/g, '&#176;C') // Специальная обработка для °C
      .replace(/\u00B0/g, '&#176;'); // Символ градуса
  }

  /**
   * Исправление кодировки и специальных символов в XML
   */
  private fixXmlEncoding(xml: string): string {
    return xml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/°C/g, '&#176;C') // Специальная обработка для °C
      .replace(/\u00B0/g, '&#176;'); // Символ градуса
  }

  /**
   * Создание нового контента для добавления в существующий документ
   */
  private async createNewContent(data: TemplateReportData, imageId: string): Promise<string> {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU');
    const timeStr = now.toLocaleTimeString('ru-RU');
    
    // Создаем заголовок для нового раздела
    const sectionHeader = `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
          <w:spacing w:before="240" w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="28"/>
            <w:szCs w:val="28"/>
          </w:rPr>
          <w:t>Дополнительный анализ от ${dateStr} ${timeStr}</w:t>
        </w:r>
      </w:p>`;

    // Создаем изображение графика
    const chartImage = `
      <w:p>
        <w:pPr>
          <w:spacing w:before="120" w:after="120"/>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="9144000" cy="6858000"/>
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
                      <a:blip r:embed="rId${imageId}"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="9144000" cy="6858000"/>
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

    // Создаем таблицу результатов анализа
    const resultsTable = this.createResultsTableXml(data.analysisResults, data.dataType);
    
    // Создаем выводы если есть
    let conclusions = '';
    if (data.conclusions && data.conclusions.trim()) {
      conclusions = `
        <w:p>
          <w:pPr>
            <w:spacing w:before="240" w:after="120"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>Выводы:</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="0" w:after="240"/>
          </w:pPr>
          <w:r>
            <w:t>${this.escapeXml(data.conclusions)}</w:t>
          </w:r>
        </w:p>`;
    }

    return sectionHeader + chartImage + resultsTable + conclusions;
  }


  /**
   * Обновление связей документа для нового изображения
   */
  private async updateDocumentRelations(zip: any, imageId: string): Promise<void> {
    try {
      // Получаем текущие связи
      const relsFile = 'word/_rels/document.xml.rels';
      let relsXml = '';
      
      if (zip.files[relsFile]) {
        relsXml = zip.files[relsFile].asText();
      } else {
        // Создаем файл связей если его нет
        relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
      }
      
      // Добавляем новую связь для изображения
      const newRelationship = `  <Relationship Id="rId${imageId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageId}.png"/>
`;
      
      // Вставляем перед закрывающим тегом
      const insertIndex = relsXml.lastIndexOf('</Relationships>');
      if (insertIndex !== -1) {
        relsXml = relsXml.substring(0, insertIndex) + newRelationship + relsXml.substring(insertIndex);
      }
      
      zip.file(relsFile, relsXml);
      console.log('Связи документа обновлены для изображения:', imageId);
      
    } catch (error) {
      console.error('Ошибка обновления связей документа:', error);
      throw error;
    }
  }

  /**
   * Валидация DOCX структуры
   */
  private validateDocxStructure(files: any): string[] {
    const requiredFiles = [
      '[Content_Types].xml',
      'word/document.xml',
      'word/_rels/document.xml.rels'
    ];
    
    const errors: string[] = [];
    
    // Проверяем наличие обязательных файлов
    requiredFiles.forEach(file => {
      if (!files[file]) {
        errors.push(`Missing required file: ${file}`);
      }
    });
    
    // Проверка XML валидности
    if (files['word/document.xml']) {
      try {
        const xmlContent = files['word/document.xml'].asText();
        
        // Проверяем на неэкранированные амперсанды
        const unescapedAmpersands = xmlContent.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
        if (unescapedAmpersands && unescapedAmpersands.length > 0) {
          errors.push(`Invalid XML: unescaped ampersands found: ${unescapedAmpersands.join(', ')}`);
        }
        
        // Проверяем на неэкранированные угловые скобки
        if (xmlContent.includes('<') && !xmlContent.includes('&lt;')) {
          const unescapedBrackets = xmlContent.match(/<(?![^>]*>)/g);
          if (unescapedBrackets && unescapedBrackets.length > 0) {
            errors.push('Invalid XML: unescaped angle brackets found');
          }
        }
        
      } catch (e) {
        errors.push('Failed to parse document.xml');
      }
    }
    
    return errors;
  }

  /**
   * Анализ содержимого DOCX шаблона для диагностики плейсхолдеров
   */
  async analyzeTemplateContent(templateFile: File): Promise<{ placeholders: string[]; hasTable: boolean; content: string }> {
    try {
      const zip = new PizZip(await templateFile.arrayBuffer());
      const documentXml = zip.files['word/document.xml'].asText();
      
      console.log('Analyzing template content...');
      console.log('Document XML length:', documentXml.length);
      
      // Найдем все плейсхолдеры
      const placeholderRegex = /\{[^}]+\}/g;
      const placeholders = documentXml.match(placeholderRegex) || [];
      console.log('Found placeholders in template:', placeholders);
      
      // Проверим наличие Table в различных формах
      const hasTableExact = documentXml.includes('{Table}');
      const hasTableNoBrackets = documentXml.includes('Table');
      
      console.log('{Table} exact match:', hasTableExact);
      console.log('Table without brackets:', hasTableNoBrackets);
      
      const hasTable = hasTableExact || hasTableNoBrackets;
      
      // Дополнительная диагностика: найдем фрагменты с "Table"
      const tableMatches = documentXml.match(/[^<]*Table[^<]*/gi) || [];
      console.log('Fragments containing "Table":', tableMatches.slice(0, 3));
      
      return {
        placeholders,
        hasTable,
        content: documentXml.substring(0, 1000) // Первые 1000 символов для анализа
      };
    } catch (error) {
      console.error('Ошибка анализа шаблона:', error);
      return {
        placeholders: [],
        hasTable: false,
        content: ''
      };
    }
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