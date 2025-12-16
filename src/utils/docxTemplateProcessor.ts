import html2canvas from 'html2canvas';
import JSZip from 'jszip';

export interface TemplateReportData {
  title: string;
  date: string;
  dataType: 'temperature' | 'humidity';
  analysisResults: any[];
  conclusions?: string;
  researchObject?: string;
  conditioningSystem?: string;
  testType?: string; // Код типа испытания (empty_volume, loaded_volume и т.д.) - используется для логики
  testTypeLabel?: string; // Читаемое название типа испытания - используется для плейсхолдера {NameTest}
 limits?: any;
  executor?: string;
  testDate?: string;
  reportNo?: string;
  reportDate?: string;
  registrationNumber?: string;
  points?: any[]; // Точки данных для вычисления дополнительных значений
  markers?: any[]; // Маркеры для вычисления дополнительных значений
  acceptanceCriterion?: string; // Критерий приемлемости для temperature_recovery
  zoomState?: { startTime: number; endTime: number; scale: number }; // Выделенный диапазон данных на графике
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
   * Чтение несжатого файла напрямую из ZIP архива
   * Используется как fallback когда PizZip не может прочитать файл
   */
  private readUncompressedFileFromZip(zipBuffer: ArrayBuffer, fileName: string): string | null {
    try {
      console.log('🔍 Начинаем прямое чтение из ZIP, ищем файл:', fileName);
      const view = new DataView(zipBuffer);
      let offset = 0;
      let foundFiles = 0;
      
      // Ищем Local File Header для нужного файла
      while (offset < zipBuffer.byteLength - 30) {
        // Проверяем сигнатуру Local File Header (0x04034b50 = "PK\x03\x04")
        const signature = view.getUint32(offset, true);
        if (signature === 0x04034b50) {
          foundFiles++;
          
          // Читаем метод сжатия (байты 8-9)
          const compressionMethod = view.getUint16(offset + 8, true);
          
          // Читаем размер имени файла (байты 26-27)
          const fileNameLength = view.getUint16(offset + 26, true);
          const extraFieldLength = view.getUint16(offset + 28, true);
          
          // Читаем имя файла
          const fileStart = offset + 30;
          if (fileStart + fileNameLength > zipBuffer.byteLength) {
            console.warn('⚠️ Выход за границы буфера при чтении имени файла');
            break;
          }
          
          const fileNameBytes = new Uint8Array(zipBuffer.slice(fileStart, fileStart + fileNameLength));
          const foundFileName = new TextDecoder('utf-8').decode(fileNameBytes);
          
          console.log(`📄 Найден файл #${foundFiles}: "${foundFileName}", метод сжатия: ${compressionMethod}`);
          
          // Если это нужный файл
          if (foundFileName === fileName) {
            console.log('✅ Найден нужный файл:', fileName);
            
            // Читаем размеры данных
            const compressedSize = view.getUint32(offset + 18, true);
            const uncompressedSize = view.getUint32(offset + 22, true);
            
            console.log('📊 Размеры файла:', {
              compressed: compressedSize,
              uncompressed: uncompressedSize,
              method: compressionMethod,
              bufferSize: zipBuffer.byteLength
            });
            
            // Пропускаем имя файла и extra field
            const dataStart = fileStart + fileNameLength + extraFieldLength;
            
            // Для несжатых файлов (STORED = 0) читаем uncompressedSize
            // Для сжатых файлов (DEFLATE = 8) читаем compressedSize, но не можем распаковать без библиотеки
            if (compressionMethod === 0) {
              // Файл не сжат, читаем напрямую
              if (dataStart + uncompressedSize > zipBuffer.byteLength) {
                console.warn('⚠️ Выход за границы буфера при чтении данных файла:', {
                  dataStart,
                  uncompressedSize,
                  required: dataStart + uncompressedSize,
                  available: zipBuffer.byteLength
                });
                return null;
              }
              
              // Читаем данные напрямую
              const fileData = new Uint8Array(zipBuffer.slice(dataStart, dataStart + uncompressedSize));
              const decoder = new TextDecoder('utf-8');
              const result = decoder.decode(fileData);
              
              console.log('✅ Файл прочитан напрямую из ZIP (STORED), длина:', result.length);
              return result;
            } else {
              // Файл сжат, но PizZip не может его прочитать
              // Попробуем использовать библиотеку pako для распаковки DEFLATE
              console.warn('⚠️ Файл сжат (method =', compressionMethod, '), но PizZip не может его прочитать');
              
              // Проверяем границы для сжатых данных
              if (dataStart + compressedSize > zipBuffer.byteLength) {
                console.warn('⚠️ Выход за границы буфера при чтении сжатых данных:', {
                  dataStart,
                  compressedSize,
                  required: dataStart + compressedSize,
                  available: zipBuffer.byteLength
                });
                return null;
              }
              
              // Для сжатых файлов мы не можем распаковать без библиотеки
              // Возвращаем null, чтобы попробовать другие методы
              console.warn('⚠️ Не можем распаковать DEFLATE без библиотеки распаковки');
              return null;
            }
          }
          
          // Переходим к следующему файлу
          // Для несжатых файлов compressedSize = uncompressedSize
          const dataSize = compressionMethod === 0 ? 
            view.getUint32(offset + 22, true) : // uncompressedSize для STORED
            view.getUint32(offset + 18, true);   // compressedSize для DEFLATE
          
          offset = fileStart + fileNameLength + extraFieldLength + dataSize;
        } else {
          // Пробуем найти следующую сигнатуру
          offset++;
          // Ограничиваем поиск, чтобы не зависнуть
          if (offset > zipBuffer.byteLength - 30) {
            break;
          }
        }
      }
      
      console.warn('⚠️ Файл не найден в ZIP архиве, проверено файлов:', foundFiles);
    } catch (error) {
      console.error('❌ Ошибка при прямом чтении из ZIP:', error);
      if (error instanceof Error) {
        console.error('Детали ошибки:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
    
    return null;
  }

  /**
   * Безопасное чтение document.xml из ZIP архива
   * Обрабатывает как сжатые, так и несжатые файлы
   * Использует JSZip для надежного чтения файлов
   */
  private async safeReadDocumentXml(zip: JSZip, filePath: string = 'word/document.xml', zipBuffer?: ArrayBuffer): Promise<string> {
    const documentFile = zip.file(filePath);
    
    if (!documentFile) {
      throw new Error(`Файл ${filePath} не найден в архиве`);
    }
    
    console.log('🔍 Информация о файле:', {
      name: documentFile.name,
      dir: documentFile.dir
    });
    
    // JSZip автоматически обрабатывает как сжатые, так и несжатые файлы
    try {
      // Пробуем прочитать как строку (JSZip автоматически распаковывает)
      const content = await documentFile.async('string');
      console.log('✅ Файл прочитан через JSZip, длина:', content.length);
      return content;
    } catch (stringError: any) {
      console.warn('⚠️ Ошибка при чтении как строки, пробуем как Uint8Array:', stringError?.message);
      
      try {
        // Пробуем прочитать как Uint8Array и декодировать вручную
        const uint8Array = await documentFile.async('uint8array');
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(uint8Array);
        console.log('✅ Файл прочитан через JSZip (Uint8Array), длина:', content.length);
        return content;
      } catch (uint8Error: any) {
        console.warn('⚠️ Ошибка при чтении как Uint8Array, пробуем как ArrayBuffer:', uint8Error?.message);
        
        try {
          // Последняя попытка - как ArrayBuffer
          const arrayBuffer = await documentFile.async('arraybuffer');
          const decoder = new TextDecoder('utf-8');
          const content = decoder.decode(arrayBuffer);
          console.log('✅ Файл прочитан через JSZip (ArrayBuffer), длина:', content.length);
          return content;
        } catch (arrayBufferError: any) {
          // Если все методы JSZip не сработали, пробуем прямое чтение из ZIP
          if (zipBuffer) {
            console.warn('⚠️ Все методы JSZip не сработали, пробуем прямое чтение из ZIP...');
            const directRead = this.readUncompressedFileFromZip(zipBuffer, filePath);
            if (directRead) {
              console.log('✅ Файл прочитан напрямую из ZIP архива (fallback), длина:', directRead.length);
              return directRead;
            }
          }
          
          throw new Error(`Не удалось прочитать файл ${filePath}. Ошибки: string=${stringError instanceof Error ? stringError.message : String(stringError)}, uint8array=${uint8Error instanceof Error ? uint8Error.message : String(uint8Error)}, arraybuffer=${arrayBufferError instanceof Error ? arrayBufferError.message : String(arrayBufferError)}`);
        }
      }
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

      // Загружаем шаблон в JSZip
      const zip = await JSZip.loadAsync(templateBuffer);

      // Читаем основной документ (с поддержкой несжатых файлов)
      const documentXml = await this.safeReadDocumentXml(zip);
      
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
      
      // Создаем папку media если её нет (JSZip создает папки автоматически)
      // Добавляем изображение
      zip.file(mediaPath, chartImageBuffer);
      console.log('Изображение добавлено в:', mediaPath);

      // Генерируем уникальный ID для связи
      const relationshipId = await this.generateRelationshipId(zip);
      console.log('Сгенерирован ID связи:', relationshipId);

      // Обновляем файл связей
      await this.updateRelationships(zip, relationshipId, `media/${imageName}`);
      
      // Обновляем [Content_Types].xml для изображения
      await this.updateContentTypes(zip, imageName);

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
      // Для нового отчета заменяем все плейсхолдеры {Table}
      const finalDocumentXml = this.processTextPlaceholders(updatedDocumentXml, data, true);
      zip.file('word/document.xml', finalDocumentXml);

      // Обрабатываем плейсхолдеры в колонтитулах
      await this.processHeaderFooterPlaceholders(zip, data);

      // Валидация DOCX структуры
      console.log('Валидация DOCX структуры...');
      const validationErrors = await this.validateDocxStructure(zip);
      if (validationErrors.length > 0) {
        console.warn('DOCX validation errors:', validationErrors);
        // Не прерываем выполнение, но логируем ошибки
      } else {
        console.log('DOCX structure validation passed');
      }

      // Генерируем итоговый DOCX файл
      console.log('Генерируем итоговый DOCX файл...');
      const buffer = await zip.generateAsync({ 
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
      const existingZip = await JSZip.loadAsync(await existingReportBlob.arrayBuffer());
      const existingDocumentXml = await this.safeReadDocumentXml(existingZip);
      
      // Загружаем новый отчет
      const newZip = await JSZip.loadAsync(await newReportBlob.arrayBuffer());
      const newDocumentXml = await this.safeReadDocumentXml(newZip);
      
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
      const buffer = await existingZip.generateAsync({ 
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
   * Копирование необходимых файлов из шаблона в существующий архив
   */
  private async copyRequiredFilesFromTemplate(templateZip: JSZip, existingZip: JSZip): Promise<void> {
    try {
      const requiredFiles = [
        'word/styles.xml',
        'word/settings.xml',
        'word/webSettings.xml',
        'word/fontTable.xml',
        'word/theme/theme1.xml',
        'docProps/app.xml',
        'docProps/core.xml'
      ];
      
      for (const fileName of requiredFiles) {
        const templateFile = templateZip.file(fileName);
        const existingFile = existingZip.file(fileName);
        
        // Копируем файл только если его нет в существующем архиве
        if (templateFile && !existingFile && !templateFile.dir) {
          try {
            const fileData = await templateFile.async('arraybuffer');
            existingZip.file(fileName, fileData);
            console.log(`Скопирован необходимый файл из шаблона: ${fileName}`);
          } catch (error) {
            console.warn(`Не удалось скопировать файл ${fileName}:`, error);
            // Не прерываем выполнение, так как это не критично
          }
        }
      }
      
      // Также копируем все файлы из word/_rels, если их нет
      const templateFiles = Object.keys(templateZip.files);
      for (const fileName of templateFiles) {
        if (fileName.startsWith('word/_rels/') && fileName !== 'word/_rels/document.xml.rels') {
          const templateFile = templateZip.file(fileName);
          const existingFile = existingZip.file(fileName);
          
          if (templateFile && !existingFile && !templateFile.dir) {
            try {
              const fileData = await templateFile.async('arraybuffer');
              existingZip.file(fileName, fileData);
              console.log(`Скопирован файл связей из шаблона: ${fileName}`);
            } catch (error) {
              console.warn(`Не удалось скопировать файл ${fileName}:`, error);
            }
          }
        }
      }
      
      console.log('Необходимые файлы из шаблона скопированы');
    } catch (error) {
      console.error('Ошибка при копировании необходимых файлов из шаблона:', error);
      // Не прерываем выполнение, так как это не критично
    }
  }

  /**
   * Копирование медиафайлов из нового отчета в существующий
   */
  private async copyMediaFiles(sourceZip: JSZip, targetZip: JSZip): Promise<void> {
    try {
      // Получаем список всех файлов в исходном архиве
      const sourceFiles = Object.keys(sourceZip.files);
      
      // Копируем медиафайлы
      for (const fileName of sourceFiles) {
        if (fileName.startsWith('word/media/')) {
          const file = sourceZip.file(fileName);
          if (file && !file.dir) {
            // Генерируем уникальное имя файла
            const timestamp = Date.now();
            const fileExtension = fileName.split('.').pop();
            const newFileName = `word/media/image_${timestamp}.${fileExtension}`;
            
            // Копируем файл
            const fileData = await file.async('arraybuffer');
            targetZip.file(newFileName, fileData);
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
        const zip = await JSZip.loadAsync(await newReportBlob.arrayBuffer());
        const documentXml = await zip.file('word/document.xml')!.async('string');
        
        // Создаем дополнительный контент из предыдущих данных
        const additionalContent = await this.createAdditionalContentFromPreviousData(previousReportData);
        
        // Добавляем дополнительный контент в конец документа
        const updatedDocumentXml = this.appendContentToDocument(documentXml, additionalContent);
        
        // Обновляем document.xml
        zip.file('word/document.xml', updatedDocumentXml);
        
        // Генерируем обновленный DOCX файл
        const buffer = await zip.generateAsync({ 
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
      // Все выводы формируются с размером шрифта 12 (Times New Roman 12pt)
      const formattedPreviousConclusions = this.convertHtmlBoldToDocx(previousData.conclusions, true);
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
          ${formattedPreviousConclusions}
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
      const existingZip = await JSZip.loadAsync(await existingDocxBlob.arrayBuffer());
      
      // Создаем скриншот нового графика
      console.log('Создаем скриншот нового графика...');
      const chartImage = await this.createRotatedScreenshot(chartElement);
      
      // Добавляем новое изображение в существующий файл
      const imageId = `chart_${Date.now()}`;
      const imageFilename = `word/media/${imageId}.png`;
      existingZip.file(imageFilename, chartImage);
      
      // Получаем текущий document.xml (с поддержкой несжатых файлов)
      const currentDocumentXml = await this.safeReadDocumentXml(existingZip);
      
      // Создаем новый контент для добавления
      const newContent = await this.createNewContent(newData, imageId);
      
      // Добавляем новый контент в конец документа
      const updatedDocumentXml = this.appendContentToDocument(currentDocumentXml, newContent);
      
      // Обновляем document.xml
      existingZip.file('word/document.xml', updatedDocumentXml);
      
      // Обновляем связи
      await this.updateDocumentRelations(existingZip, imageId);
      
      // Генерируем обновленный DOCX файл
      const buffer = await existingZip.generateAsync({ 
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
      const existingZip = await JSZip.loadAsync(existingBuffer);
      
      // Читаем шаблон для новых данных
      const templateBuffer = await templateFile.arrayBuffer();
      const templateZip = await JSZip.loadAsync(templateBuffer);
      
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
      const newRelationshipId = await this.generateRelationshipId(existingZip);
      console.log('Сгенерирован новый ID связи:', newRelationshipId);
      
      // Обновляем файл связей в существующем отчете
      await this.updateRelationships(existingZip, newRelationshipId, `media/${newImageName}`);
      
      // Обновляем [Content_Types].xml для нового изображения
      await this.updateContentTypes(existingZip, newImageName);
      
      // Читаем содержимое шаблона для получения структуры новых данных (с поддержкой несжатых файлов)
      const templateDocumentXml = await this.safeReadDocumentXml(templateZip);
      
      // ВАЖНО: Обрабатываем ТОЛЬКО шаблон с новыми данными, не затрагивая существующий документ
      // Сначала заменяем плейсхолдер графика в шаблоне
      let processedTemplateXml = this.replaceChartPlaceholder(templateDocumentXml, newRelationshipId);
      
      // Затем обрабатываем текстовые плейсхолдеры ТОЛЬКО в шаблоне
      // Это гарантирует, что существующий контент не будет затронут
      // Для добавления в существующий отчет заменяем только первый плейсхолдер {Table}
      processedTemplateXml = this.processTextPlaceholders(processedTemplateXml, data, false);
      
      // Читаем существующий документ (с поддержкой несжатых файлов)
      // ВАЖНО: НЕ обрабатываем существующий документ, только читаем его как есть
      const existingDocumentXml = await this.safeReadDocumentXml(existingZip);
      
      // Добавляем обработанный контент из шаблона в конец существующего документа
      // Существующий контент остается нетронутым
      const updatedDocumentXml = this.appendContentToDocument(existingDocumentXml, processedTemplateXml);
      
      // Сохраняем обновленный документ
      existingZip.file('word/document.xml', updatedDocumentXml);
      
      // Копируем необходимые файлы из шаблона в существующий архив
      // (стили, темы, настройки и т.д., если их нет в существующем архиве)
      await this.copyRequiredFilesFromTemplate(templateZip, existingZip);
      
      // Обрабатываем плейсхолдеры в колонтитулах ТОЛЬКО для новых данных
      // (не затрагивая существующие колонтитулы, если они уже обработаны)
      await this.processHeaderFooterPlaceholders(existingZip, data);
      
      // Валидация DOCX структуры перед генерацией
      console.log('Валидация DOCX структуры перед генерацией...');
      const validationErrors = await this.validateDocxStructure(existingZip);
      if (validationErrors.length > 0) {
        console.error('DOCX validation errors:', validationErrors);
        throw new Error(`DOCX structure validation failed: ${validationErrors.join('; ')}`);
      } else {
        console.log('DOCX structure validation passed');
      }
      
      // Проверяем валидность XML перед генерацией
      try {
        const finalXml = await this.safeReadDocumentXml(existingZip);
        // Проверяем на незакрытые теги
        const openTags = (finalXml.match(/<w:[^/>]+>/g) || []).length;
        const closeTags = (finalXml.match(/<\/w:[^>]+>/g) || []).length;
        if (Math.abs(openTags - closeTags) > 10) { // Допускаем небольшую разницу из-за самозакрывающихся тегов
          console.warn(`XML tag mismatch: ${openTags} open tags, ${closeTags} close tags`);
        }
      } catch (xmlError) {
        console.error('XML validation error:', xmlError);
        throw new Error(`XML validation failed: ${xmlError instanceof Error ? xmlError.message : 'Unknown error'}`);
      }
      
      // Генерируем обновленный DOCX файл
      console.log('Генерируем обновленный DOCX файл...');
      const buffer = await existingZip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        streamFiles: false // Важно: отключаем потоковую генерацию для корректной структуры
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
      const bodyStartTag = '<w:body';
      const bodyEndTag = '</w:body>';
      
      // Ищем начало body с учетом возможных атрибутов
      const newContentStart = newContentXml.indexOf(bodyStartTag);
      if (newContentStart === -1) {
        throw new Error('Не удалось найти начало body в шаблоне');
      }
      
      // Находим закрывающий тег > после <w:body
      const bodyTagEnd = newContentXml.indexOf('>', newContentStart);
      if (bodyTagEnd === -1) {
        throw new Error('Не удалось найти конец тега body в шаблоне');
      }
      
      const newContentEnd = newContentXml.lastIndexOf(bodyEndTag);
      if (newContentEnd === -1) {
        throw new Error('Не удалось найти конец body в шаблоне');
      }
      
      // Извлекаем только содержимое body (без тегов)
      const newBodyContent = newContentXml.substring(
        bodyTagEnd + 1,
        newContentEnd
      );
      
      // Добавляем разделитель страницы и новый контент перед закрывающим тегом body
      const pageBreak = `
        <w:p>
          <w:r>
            <w:br w:type="page"/>
          </w:r>
        </w:p>`;
      
      // Используем lastIndexOf для поиска последнего вхождения </w:body> в существующем документе
      const existingBodyEndIndex = existingXml.lastIndexOf(bodyEndTag);
      if (existingBodyEndIndex === -1) {
        throw new Error('Не удалось найти конец body в существующем документе');
      }
      
      // Вставляем новый контент перед закрывающим тегом </w:body>
      const beforeBody = existingXml.substring(0, existingBodyEndIndex);
      const afterBody = existingXml.substring(existingBodyEndIndex);
      
      const updatedXml = beforeBody + pageBreak + newBodyContent + afterBody;
      
      // Проверяем, что XML остался валидным (базовая проверка)
      if (!updatedXml.includes('<w:body') || !updatedXml.includes('</w:body>')) {
        throw new Error('Структура XML нарушена после добавления контента');
      }
      
      return updatedXml;
    } catch (error) {
      console.error('Ошибка добавления контента в документ:', error);
      throw new Error(`Не удалось добавить новый контент в существующий документ: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  private async generateRelationshipId(zip: JSZip): Promise<string> {
    const relsPath = 'word/_rels/document.xml.rels';
    let maxId = 0;
    
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      const relsXml = await relsFile.async('string');
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
  private async updateRelationships(zip: JSZip, relationshipId: string, imagePath: string): Promise<void> {
    const relsPath = 'word/_rels/document.xml.rels';
    let relsXml: string;
    
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      relsXml = await relsFile.async('string');
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
    console.log('Обновлен файл связей:', relsPath, 'с ID:', relationshipId);
  }

  /**
   * Обновление [Content_Types].xml для добавления нового файла
   */
  private async updateContentTypes(zip: JSZip, fileName: string): Promise<void> {
    const contentTypesPath = '[Content_Types].xml';
    let contentTypesXml: string;
    
    const contentTypesFile = zip.file(contentTypesPath);
    if (!contentTypesFile) {
      console.warn('[Content_Types].xml not found, creating default');
      contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
    } else {
      contentTypesXml = await contentTypesFile.async('string');
    }

    // Определяем тип контента по расширению файла
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    let contentType = '';
    let partName = '';
    
    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
      contentType = 'image/png';
      if (extension === 'jpg' || extension === 'jpeg') {
        contentType = 'image/jpeg';
      }
      partName = `/word/media/${fileName}`;
    } else if (extension === 'xml') {
      contentType = 'application/xml';
      partName = `/word/${fileName}`;
    }

    // Проверяем, не добавлен ли уже этот файл
    if (partName && !contentTypesXml.includes(`PartName="${partName}"`)) {
      // Добавляем Override для конкретного файла перед закрывающим тегом
      const overrideEntry = `  <Override PartName="${partName}" ContentType="${contentType}"/>
`;
      contentTypesXml = contentTypesXml.replace('</Types>', `${overrideEntry}</Types>`);
      
      zip.file(contentTypesPath, contentTypesXml);
      console.log('Обновлен [Content_Types].xml для файла:', fileName);
    } else if (partName) {
      console.log('Файл уже присутствует в [Content_Types].xml:', fileName);
    }
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
   * @param documentXml - XML документ
   * @param data - данные для шаблона
   * @param replaceAllTables - если true, заменяет все плейсхолдеры {Table}, иначе только первый (по умолчанию false)
   */
  private processTextPlaceholders(documentXml: string, data: TemplateReportData, replaceAllTables: boolean = false): string {
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
      // Преобразуем HTML-теги <b> в DOCX-формат перед экранированием
      // Все выводы формируются с размером шрифта 12 (Times New Roman 12pt)
      const formattedConclusions = this.convertHtmlBoldToDocx(data.conclusions, true);
      result = result.replace(/{Result}/g, formattedConclusions);
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
    // Используем testTypeLabel (читаемое название) если доступно, иначе testType (код)
    const testTypeName = data.testTypeLabel || data.testType;
    if (testTypeName) {
      console.log('Replacing {NameTest} with:', testTypeName);
      result = result.replace(/{NameTest}/g, this.escapeXml(testTypeName));
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
    
    // Обработка плейсхолдера {RegistrationNumber} для регистрационного номера автомобиля
    if (data.registrationNumber) {
      console.log('Replacing {RegistrationNumber} with:', data.registrationNumber);
      result = result.replace(/{RegistrationNumber}/g, this.escapeXml(data.registrationNumber));
    } else {
      console.log('registrationNumber is empty or undefined:', data.registrationNumber, 'replacing {RegistrationNumber} with empty string');
      result = result.replace(/{RegistrationNumber}/g, '');
    }
    
    // Исправляем неправильные плейсхолдеры с двойными скобками перед обработкой
    result = result.replace(/\{\{Table\}\}/g, '{Table}');
    result = result.replace(/\{\{Table\}/g, '{Table}');
    result = result.replace(/\{Table\}\}/g, '{Table}');
    
    // Обработка плейсхолдера {Table}
    // Для нового отчета заменяем все плейсхолдеры, для добавления в существующий - только первый
    result = this.processTablePlaceholder(result, data, replaceAllTables);
    
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
   * Преобразование HTML-тегов <b> в DOCX-формат для жирного текста
   * @param text - текст с HTML тегами
   * @param applyFontStyle - применять ли стили Times New Roman 12pt (по умолчанию true для выводов)
   */
  private convertHtmlBoldToDocx(text: string, applyFontStyle: boolean = true): string {
    if (!text) return '';
    
    // Разбиваем текст на части, разделенные тегами <b> и </b>, и переносами строк
    const parts: Array<{ text: string; isBold: boolean; isLineBreak: boolean }> = [];
    let currentIndex = 0;
    let isBold = false;
    
    // Регулярное выражение для поиска открывающих и закрывающих тегов <b> и переносов строк
    const tagRegex = /<\/?b>|\n/gi;
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      // Добавляем текст до тега или переноса строки
      if (match.index > currentIndex) {
        const textPart = text.substring(currentIndex, match.index);
        if (textPart) {
          parts.push({ text: textPart, isBold, isLineBreak: false });
        }
      }
      
      // Обрабатываем найденный элемент
      if (match[0] === '\n') {
        // Перенос строки
        parts.push({ text: '', isBold: false, isLineBreak: true });
      } else if (match[0].toLowerCase() === '<b>') {
        isBold = true;
      } else if (match[0].toLowerCase() === '</b>') {
        isBold = false;
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Добавляем оставшийся текст
    if (currentIndex < text.length) {
      const textPart = text.substring(currentIndex);
      if (textPart) {
        parts.push({ text: textPart, isBold, isLineBreak: false });
      }
    }
    
    // Если не было найдено тегов и переносов строк, возвращаем исходный текст с экранированием
    if (parts.length === 0) {
      const escapedText = this.escapeXml(text);
      // Используем xml:space="preserve" для сохранения пробелов
      const spacePreserve = ' xml:space="preserve"';
      if (applyFontStyle) {
        // Применяем стили Times New Roman 12pt
        return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t${spacePreserve}>${escapedText}</w:t></w:r>`;
      }
      return `<w:r><w:t${spacePreserve}>${escapedText}</w:t></w:r>`;
    }
    
    // Формируем DOCX XML для каждой части
    let result = '';
    for (const part of parts) {
      if (part.isLineBreak) {
        // Перенос строки: <w:br/>
        result += '<w:br/>';
      } else {
        const escapedText = this.escapeXml(part.text);
        // Используем xml:space="preserve" для сохранения пробелов (особенно в конце текста)
        const spacePreserve = ' xml:space="preserve"';
        
        if (applyFontStyle) {
          // Применяем стили Times New Roman 12pt
          if (part.isBold) {
            // Жирный текст с Times New Roman 12pt: <w:r><w:rPr><w:rFonts.../><w:sz.../><w:b/></w:rPr><w:t xml:space="preserve">текст</w:t></w:r>
            result += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:b/></w:rPr><w:t${spacePreserve}>${escapedText}</w:t></w:r>`;
          } else {
            // Обычный текст с Times New Roman 12pt: <w:r><w:rPr><w:rFonts.../><w:sz.../></w:rPr><w:t xml:space="preserve">текст</w:t></w:r>
            result += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t${spacePreserve}>${escapedText}</w:t></w:r>`;
          }
        } else {
          // Без применения стилей шрифта
          if (part.isBold) {
            // Жирный текст: <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">текст</w:t></w:r>
            result += `<w:r><w:rPr><w:b/></w:rPr><w:t${spacePreserve}>${escapedText}</w:t></w:r>`;
          } else {
            // Обычный текст: <w:r><w:t xml:space="preserve">текст</w:t></w:r>
            result += `<w:r><w:t${spacePreserve}>${escapedText}</w:t></w:r>`;
          }
        }
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
      'Result', 'Object', 'ConditioningSystem', 'System', 'NameTest', 'chart', 'Table', 'Limits', 'Executor', 'TestDate', 'ReportNo', 'ReportDate', 'title', 'date', 'RegistrationNumber'
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
    // НО только если это не внутри уже существующей таблицы (w:tbl)
    const tableInXml = /<w:t[^>]*>Table<\/w:t>/gi;
    // Заменяем только если это не внутри тега w:tbl
    result = result.replace(tableInXml, (match, offset, string) => {
      // Проверяем, не находимся ли мы внутри тега w:tbl
      const beforeMatch = string.substring(0, offset);
      const lastTblOpen = beforeMatch.lastIndexOf('<w:tbl');
      const lastTblClose = beforeMatch.lastIndexOf('</w:tbl>');
      
      // Если последний открывающий тег w:tbl идет после последнего закрывающего, значит мы внутри таблицы
      if (lastTblOpen > lastTblClose) {
        return match; // Не заменяем, если внутри таблицы
      }
      
      // Дополнительная проверка: не заменяем, если это часть уже обработанной таблицы
      // Проверяем, есть ли после этого места закрывающий тег таблицы без открывающего
      const afterMatch = string.substring(offset);
      const nextTblClose = afterMatch.indexOf('</w:tbl>');
      const nextTblOpen = afterMatch.indexOf('<w:tbl');
      
      // Если следующий закрывающий тег таблицы идет раньше следующего открывающего, значит мы внутри таблицы
      if (nextTblClose !== -1 && (nextTblOpen === -1 || nextTblClose < nextTblOpen)) {
        return match; // Не заменяем, если внутри таблицы
      }
      
      return '<w:t>{Table}</w:t>';
    });
    
    // Ищем случаи, где Table может быть просто "Table" без фигурных скобок
    // НО только если это не внутри уже существующей таблицы
    const tableNoBrackets = /(?<!\{)Table(?!\})/gi;
    result = result.replace(tableNoBrackets, (match, offset, string) => {
      // Проверяем, не находимся ли мы внутри тега w:tbl
      const beforeMatch = string.substring(0, offset);
      const lastTblOpen = beforeMatch.lastIndexOf('<w:tbl');
      const lastTblClose = beforeMatch.lastIndexOf('</w:tbl>');
      
      // Если последний открывающий тег w:tbl идет после последнего закрывающего, значит мы внутри таблицы
      if (lastTblOpen > lastTblClose) {
        return match; // Не заменяем, если внутри таблицы
      }
      
      // Дополнительная проверка: не заменяем, если это часть уже обработанной таблицы
      const afterMatch = string.substring(offset);
      const nextTblClose = afterMatch.indexOf('</w:tbl>');
      const nextTblOpen = afterMatch.indexOf('<w:tbl');
      
      // Если следующий закрывающий тег таблицы идет раньше следующего открывающего, значит мы внутри таблицы
      if (nextTblClose !== -1 && (nextTblOpen === -1 || nextTblClose < nextTblOpen)) {
        return match; // Не заменяем, если внутри таблицы
      }
      
      return '{Table}';
    });
    
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
   * @param documentXml - XML документ
   * @param data - данные для шаблона
   * @param replaceAll - если true, заменяет все плейсхолдеры {Table}, иначе только первый (по умолчанию false)
   */
  private processTablePlaceholder(documentXml: string, data: TemplateReportData, replaceAll: boolean = false): string {
    console.log('Processing {Table} placeholder...');
    console.log('Document contains {Table}:', documentXml.includes('{Table}'));
    console.log('Analysis results count:', data.analysisResults?.length || 0);
    console.log('Replace all placeholders:', replaceAll);
    
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

    // Создаем XML структуру таблицы с учетом типа испытания
    const tableXml = this.createResultsTableXml(
      data.analysisResults, 
      data.dataType, 
      data.testType || '',
      data.points || [],
      data.markers || [],
      data.limits,
      data.acceptanceCriterion || '',
      data.zoomState
    );
    console.log('Generated table XML length:', tableXml.length);
    console.log('Table XML preview:', tableXml.substring(0, 200) + '...');
    
    // Заменяем плейсхолдер(ы) {Table} на таблицу
    // Для нового отчета заменяем все, для добавления в существующий - только первый
    const result = replaceAll 
      ? documentXml.replace(/{Table}/g, tableXml)
      : documentXml.replace(/{Table}/, tableXml);
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
   * @param results - результаты анализа
   * @param dataType - тип данных (temperature/humidity)
   * @param testType - тип испытания (empty_volume, loaded_volume, power_off, power_on, temperature_recovery)
   * @param points - точки данных для вычисления дополнительных значений
   * @param markers - маркеры для вычисления дополнительных значений
   * @param limits - лимиты температуры/влажности
   * @param acceptanceCriterion - критерий приемлемости для temperature_recovery
   * @param zoomState - выделенный диапазон данных на графике (если есть)
   */
  public createResultsTableXml(
    results: any[], 
    dataType: 'temperature' | 'humidity',
    testType: string = '',
    points: any[] = [],
    markers: any[] = [],
    limits: any = {},
    acceptanceCriterion: string = '',
    zoomState?: { startTime: number; endTime: number; scale: number }
  ): string {
    console.log('Creating results table XML...');
    console.log('Results count:', results?.length || 0);
    console.log('DataType:', dataType);
    console.log('TestType:', testType);
    console.log('Results data:', results);
    
    if (!results || results.length === 0) {
      console.log('No results to create table');
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }

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

    // Функция для форматирования времени
    const formatTimeDuration = (milliseconds: number): string => {
      const totalMinutes = Math.floor(milliseconds / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    // Вспомогательные функции для вычислений (копии из TimeSeriesAnalyzer)
    const calculateTimeInRangeAfterPowerOff = (
      points: any[],
      markerTimestamp: number,
      minLimit: number | undefined,
      maxLimit: number | undefined
    ): string => {
      if (!minLimit || !maxLimit || !points || points.length === 0) return '-';
      
      const pointsAfterMarker = points
        .filter((p: any) => p.timestamp >= markerTimestamp && p.temperature !== undefined)
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
      
      if (pointsAfterMarker.length === 0) return '-';
      
      // Находим первую точку, где температура вышла за пределы лимитов
      let firstOutOfRangeIndex = -1;
      for (let i = 0; i < pointsAfterMarker.length; i++) {
        const temp = pointsAfterMarker[i].temperature!;
        if (temp < minLimit || temp > maxLimit) {
          firstOutOfRangeIndex = i;
          break; // Нашли первую точку выхода за пределы
        }
      }
      
      // Если не нашли точку выхода за пределы, значит все время в диапазоне
      if (firstOutOfRangeIndex === -1) {
        return 'за пределы не выходила';
      }
      
      // Вычисляем время от маркера до момента выхода за пределы
      const timeToOutOfRange = pointsAfterMarker[firstOutOfRangeIndex].timestamp - markerTimestamp;
      return formatTimeDuration(timeToOutOfRange);
    };

    const calculateRecoveryTimeAfterPowerOn = (
      points: any[],
      markerTimestamp: number,
      minLimit: number | undefined,
      maxLimit: number | undefined
    ): string => {
      if (!minLimit || !maxLimit || !points || points.length === 0) return '-';
      
      // Фильтруем точки после маркера включения
      // Примечание: zoomState уже применен к points перед вызовом этой функции
      const pointsAfterMarker = points
        .filter((p: any) => p.timestamp >= markerTimestamp && p.temperature !== undefined)
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
      
      if (pointsAfterMarker.length === 0) return '-';
      
      // Проверяем, выходила ли температура за пределы лимитов
      let hasExceededLimits = false;
      for (let i = 0; i < pointsAfterMarker.length; i++) {
        const temp = pointsAfterMarker[i].temperature!;
        if (temp < minLimit || temp > maxLimit) {
          hasExceededLimits = true;
          break;
        }
      }
      
      // Если температура не выходила за пределы, возвращаем "за пределы не выходила"
      if (!hasExceededLimits) {
        return 'за пределы не выходила';
      }
      
      // Находим первую точку, где температура входит в диапазон (возвращается к лимитам)
      for (let i = 0; i < pointsAfterMarker.length; i++) {
        const temp = pointsAfterMarker[i].temperature!;
        if (temp >= minLimit && temp <= maxLimit) {
          const recoveryTime = pointsAfterMarker[i].timestamp - markerTimestamp;
          return formatTimeDuration(recoveryTime);
        }
      }
      
      // Если температура выходила за пределы, но не вернулась в диапазон
      return '-';
    };

    const calculateRecoveryTimeAfterDoorOpening = (
      points: any[],
      doorMarkers: any[],
      minLimit: number | undefined,
      maxLimit: number | undefined,
      acceptanceCriterionValue: string
    ): { time: string; meetsCriterion: string } => {
      if (!minLimit || !maxLimit || !points || points.length === 0) {
        return { time: '-', meetsCriterion: '-' };
      }
      
      const pointsWithTemp = points
        .filter((p: any) => p.temperature !== undefined)
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
      
      if (pointsWithTemp.length === 0) {
        return { time: '-', meetsCriterion: '-' };
      }
      
      let filteredPoints: any[] = [];
      
      if (doorMarkers.length === 0) {
        // Если маркеров нет, используем все данные
        filteredPoints = pointsWithTemp;
      } else {
        // Сортируем маркеры по времени
        const sortedMarkers = [...doorMarkers].sort((a: any, b: any) => a.timestamp - b.timestamp);
        
        // Находим пары маркеров: Закрытие двери -> Восстановление температуры
        const closingMarkers = sortedMarkers.filter((m: any) => m.type === 'door_closing');
        const recoveryMarkers = sortedMarkers.filter((m: any) => m.type === 'temperature_recovery');
        
        if (closingMarkers.length === 0 || recoveryMarkers.length === 0) {
          // Если нет нужных маркеров, используем все данные
          filteredPoints = pointsWithTemp;
        } else {
          // Для каждой пары "Закрытие двери" - "Восстановление температуры" используем данные между ними
          for (const closingMarker of closingMarkers) {
            // Находим ближайший маркер "Восстановление температуры" после "Закрытие двери"
            const recoveryMarker = recoveryMarkers.find((m: any) => m.timestamp > closingMarker.timestamp);
            
            if (recoveryMarker) {
              // Данные между "Закрытие двери" и "Восстановление температуры" (включительно)
              const rangePoints = pointsWithTemp.filter((p: any) => 
                p.timestamp >= closingMarker.timestamp && p.timestamp <= recoveryMarker.timestamp
              );
              filteredPoints.push(...rangePoints);
            } else {
              // Если нет маркера восстановления после закрытия, используем данные от закрытия до конца
              const rangePoints = pointsWithTemp.filter((p: any) => p.timestamp >= closingMarker.timestamp);
              filteredPoints.push(...rangePoints);
            }
          }
          
          // Удаляем дубликаты и сортируем
          filteredPoints = filteredPoints
            .filter((point: any, index: number, self: any[]) => 
              index === self.findIndex((p: any) => p.timestamp === point.timestamp)
            )
            .sort((a: any, b: any) => a.timestamp - b.timestamp);
        }
      }
      
      if (filteredPoints.length === 0) {
        return { time: '-', meetsCriterion: '-' };
      }
      
      let totalTimeOutsideLimits = 0;
      let isCurrentlyOutside = false;
      let outsideStartTime: number | null = null;
      
      for (let i = 0; i < filteredPoints.length; i++) {
        const temp = filteredPoints[i].temperature!;
        const isOutside = temp < minLimit || temp > maxLimit;
        
        if (isOutside && !isCurrentlyOutside) {
          isCurrentlyOutside = true;
          outsideStartTime = filteredPoints[i].timestamp;
        } else if (!isOutside && isCurrentlyOutside && outsideStartTime !== null) {
          const periodDuration = filteredPoints[i].timestamp - outsideStartTime;
          totalTimeOutsideLimits += periodDuration;
          isCurrentlyOutside = false;
          outsideStartTime = null;
        }
      }
      
      if (isCurrentlyOutside && outsideStartTime !== null && filteredPoints.length > 0) {
        const lastPoint = filteredPoints[filteredPoints.length - 1];
        const periodDuration = lastPoint.timestamp - outsideStartTime;
        totalTimeOutsideLimits += periodDuration;
      }
      
      if (totalTimeOutsideLimits === 0) {
        return { time: 'за пределы не выходила', meetsCriterion: 'Да' };
      }
      
      const timeInMinutes = Math.floor(totalTimeOutsideLimits / (1000 * 60));
      const criterionValue = acceptanceCriterionValue ? parseInt(acceptanceCriterionValue) : 0;
      const meetsCriterion = timeInMinutes <= criterionValue ? 'Да' : 'Нет';
      const timeString = `${timeInMinutes} мин.`;
      
      return { time: timeString, meetsCriterion };
    };

    // Создаем таблицу в зависимости от типа испытания
    // zoomState уже передан как параметр функции
    if (testType === 'power_off') {
      return this.createPowerOffTableXml(results, points, markers, limits, escapeXml, calculateTimeInRangeAfterPowerOff, zoomState);
    } else if (testType === 'power_on') {
      return this.createPowerOnTableXml(results, points, markers, limits, escapeXml, calculateRecoveryTimeAfterPowerOn, zoomState);
    } else if (testType === 'temperature_recovery') {
      return this.createTemperatureRecoveryTableXml(results, points, markers, limits, acceptanceCriterion, escapeXml, (points, doorMarkers, minLimit, maxLimit) => calculateRecoveryTimeAfterDoorOpening(points, doorMarkers, minLimit, maxLimit, acceptanceCriterion), zoomState);
    } else {
      // Стандартная таблица для empty_volume и loaded_volume
      return this.createStandardTableXml(results, dataType, escapeXml);
    }
  }

  /**
   * Создание стандартной таблицы для empty_volume и loaded_volume
   */
  private createStandardTableXml(results: any[], dataType: 'temperature' | 'humidity', escapeXml: (text: string) => string): string {
    // Сортируем результаты: внешние датчики в конце, затем по номеру зоны и уровню
    const sortedResults = [...results].sort((a, b) => {
      const isExternalA = a.isExternal || a.zoneNumber?.toString() === '0' || a.zoneNumber === 'Внешний';
      const isExternalB = b.isExternal || b.zoneNumber?.toString() === '0' || b.zoneNumber === 'Внешний';
      if (isExternalA && !isExternalB) return 1;
      if (!isExternalA && isExternalB) return -1;

      const zoneA = parseFloat(a.zoneNumber);
      const zoneB = parseFloat(b.zoneNumber);
      if (!isNaN(zoneA) && !isNaN(zoneB) && zoneA !== zoneB) {
        return zoneA - zoneB;
      }

      const levelA = parseFloat(a.measurementLevel);
      const levelB = parseFloat(b.measurementLevel);
      if (!isNaN(levelA) && !isNaN(levelB) && levelA !== levelB) {
        return levelA - levelB;
      }

      return 0;
    });

    // Находим глобальные минимальные и максимальные значения (исключая внешние датчики)
    const nonExternalResults = sortedResults.filter(result => !result.isExternal);
    
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;

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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>№ зоны</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Уровень (м.)</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Наименование логгера</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Серийный № логгера</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Мин. t°C</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Макс. t°C</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Среднее t°C</w:t></w:r>
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
            <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Соответствие критериям</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>`;

    // Строки данных
    const dataRows = sortedResults.map(result => {
      // Определяем цвет фона для соответствия лимитам
      const complianceColor = result.meetsLimits === 'Да' ? 'C6EFCE' : 
                             result.meetsLimits === 'Нет' ? 'FFC7CE' : 'FFFFFF';
      
      // Определяем цвета для минимальных и максимальных значений
      const minTempValue = parseFloat(result.minTemp);
      const maxTempValue = parseFloat(result.maxTemp);
      const minTempFormatted = isNaN(minTempValue)
        ? (result.minTemp !== undefined && result.minTemp !== null ? result.minTemp.toString() : '-')
        : minTempValue.toFixed(1).replace('.', ',');
      const maxTempFormatted = isNaN(maxTempValue)
        ? (result.maxTemp !== undefined && result.maxTemp !== null ? result.maxTemp.toString() : '-')
        : maxTempValue.toFixed(1).replace('.', ',');
      
      const minTempColor = (!result.isExternal && !isNaN(minTempValue) && 
                          globalMinTemp !== null && minTempValue === globalMinTemp) ? 
                          'ADD8E6' : 'FFFFFF'; // Светло-голубой для минимума
      
      const maxTempColor = (!result.isExternal && !isNaN(maxTempValue) && 
                          globalMaxTemp !== null && maxTempValue === globalMaxTemp) ? 
                          'FFB6C1' : 'FFFFFF'; // Светло-розовый для максимума
      
      const avgRaw = result.avgTemp;
      const avgNumber = typeof avgRaw === 'number' ? avgRaw : parseFloat(avgRaw);
      const avgTempFormatted = isNaN(avgNumber)
        ? (avgRaw !== undefined && avgRaw !== null ? avgRaw.toString() : '-')
        : avgNumber.toFixed(1).replace('.', ',');

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
              <w:r><w:t>${escapeXml(minTempFormatted)}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(maxTempFormatted)}</w:t></w:r>
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
              <w:r><w:t>${escapeXml(avgTempFormatted)}</w:t></w:r>
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
          <w:gridCol w:w="3500"/>
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
   * Создание таблицы для power_off: Испытание на сбой электропитания (отключение)
   */
  private createPowerOffTableXml(
    results: any[],
    points: any[],
    markers: any[],
    limits: any,
    escapeXml: (text: string) => string,
    calculateTimeInRange: (points: any[], markerTimestamp: number, minLimit: number | undefined, maxLimit: number | undefined) => string,
    zoomState?: { startTime: number; endTime: number; scale: number }
  ): string {
    // Находим маркер типа 'power' с наименованием 'Отключение'
    const testMarker = markers.find((m: any) => m.type === 'power' && m.label === 'Отключение');
    if (!testMarker || !limits.temperature) {
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }

    const headerRow = `
      <w:tr>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>№ зоны</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Уровень (м.)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Номер логгера</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Серийный № логгера</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Питание отключено. Время, в течение которого температура находится в требуемом диапазоне, (час: мин)</w:t></w:r></w:p></w:tc>
      </w:tr>`;

    // Показываем все датчики, но для внешних не рассчитываем время
    const dataRows = results.map(result => {
      const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
      const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(result.zoneNumber.toString()) || 0);
      
      // Для внешних датчиков не рассчитываем время
      let timeInRange = '-';
      if (!isExternal) {
        // Фильтруем точки по зоне и уровню
        let filePoints = points.filter((p: any) => {
          const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
          const pLevel = p.measurementLevel?.toString() || 'unknown';
          return `${pZone}_${pLevel}` === `${zoneNumber}_${result.measurementLevel.toString()}`;
        });
        
        // ВАЖНО: Если есть выделенный диапазон (zoomState), используем только эти данные
        // Это гарантирует соответствие данных в отчете данным на странице
        if (zoomState) {
          filePoints = filePoints.filter((p: any) => 
            p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
          );
        }
        
        timeInRange = calculateTimeInRange(filePoints, testMarker.timestamp, limits.temperature.min, limits.temperature.max);
      }
      
      return `
        <w:tr>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешний' : result.zoneNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ','))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.loggerName)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.serialNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(timeInRange)}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
    }).join('');

    return `
      <w:tbl>
        <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>
        <w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="4000"/></w:tblGrid>
        ${headerRow}${dataRows}
      </w:tbl>`;
  }

  /**
   * Создание таблицы для power_on: Испытание на сбой электропитания (включение)
   */
  private createPowerOnTableXml(
    results: any[],
    points: any[],
    markers: any[],
    limits: any,
    escapeXml: (text: string) => string,
    calculateRecoveryTime: (points: any[], markerTimestamp: number, minLimit: number | undefined, maxLimit: number | undefined) => string,
    zoomState?: { startTime: number; endTime: number; scale: number }
  ): string {
    // Находим маркер типа 'power' с наименованием 'Включение'
    const testMarker = markers.find((m: any) => m.type === 'power' && m.label === 'Включение');
    if (!testMarker || !limits.temperature) {
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }

    const headerRow = `
      <w:tr>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>№ зоны</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Уровень (м.)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Номер логгера</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Серийный № логгера</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Питание включено. Время восстановления до требуемого диапазона температур, (час: мин)</w:t></w:r></w:p></w:tc>
      </w:tr>`;

    // Показываем все датчики, но для внешних не рассчитываем время
    const dataRows = results.map(result => {
      const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
      const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
      const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
      
      // Для внешних датчиков не рассчитываем время
      let recoveryTime = '-';
      if (!isExternal) {
        // Фильтруем точки по зоне и уровню
        let filePoints = points.filter((p: any) => {
          const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
          const pLevel = p.measurementLevel?.toString() || 'unknown';
          return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
        });
        
        // ВАЖНО: Если есть выделенный диапазон (zoomState), используем только эти данные
        if (zoomState) {
          filePoints = filePoints.filter((p: any) => 
            p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
          );
        }
        
        recoveryTime = calculateRecoveryTime(filePoints, testMarker.timestamp, limits.temperature.min, limits.temperature.max);
      }
      
      return `
        <w:tr>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешний' : result.zoneNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ','))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.loggerName)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.serialNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(recoveryTime)}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
    }).join('');

    return `
      <w:tbl>
        <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>
        <w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="4000"/></w:tblGrid>
        ${headerRow}${dataRows}
      </w:tbl>`;
  }

  /**
   * Создание таблицы для temperature_recovery: Испытание по восстановлению температуры после открытия двери
   */
  private createTemperatureRecoveryTableXml(
    results: any[],
    points: any[],
    markers: any[],
    limits: any,
    acceptanceCriterion: string,
    escapeXml: (text: string) => string,
    calculateRecoveryTime: (points: any[], doorMarkers: any[], minLimit: number | undefined, maxLimit: number | undefined) => { time: string; meetsCriterion: string },
    zoomState?: { startTime: number; endTime: number; scale: number }
  ): string {
    if (!limits.temperature) {
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }

    // Получаем маркеры в последовательности: Открытие двери -> Закрытие двери -> Восстановление температуры
    const doorMarkers = markers.filter((m: any) => 
      m.type === 'door_opening' || m.type === 'door_closing' || m.type === 'temperature_recovery'
    ).sort((a: any, b: any) => a.timestamp - b.timestamp);

    const headerRow = `
      <w:tr>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>№ зоны</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Уровень (м.)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Номер логгера</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Серийный № логгера</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Время восстановления до заданного диапазона температур, (час: мин)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr><w:t>Соответствует критерию</w:t></w:r></w:p></w:tc>
      </w:tr>`;

    const dataRows = results.map(result => {
      const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
      const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
      const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
      
      // Для внешних датчиков не рассчитываем время и соответствие критерию
      let recoveryData = { time: '-', meetsCriterion: '-' };
      let complianceColor = 'FFFFFF';
      
      if (!isExternal) {
        // Фильтруем точки по зоне и уровню
        let filePoints = points.filter((p: any) => {
          const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
          const pLevel = p.measurementLevel?.toString() || 'unknown';
          return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
        });
        
        // ВАЖНО: Если есть выделенный диапазон (zoomState), используем только эти данные
        if (zoomState) {
          filePoints = filePoints.filter((p: any) => 
            p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
          );
        }
        
        recoveryData = calculateRecoveryTime(filePoints, doorMarkers, limits.temperature.min, limits.temperature.max);
        complianceColor = recoveryData.meetsCriterion === 'Да' ? 'C6EFCE' : recoveryData.meetsCriterion === 'Нет' ? 'FFC7CE' : 'FFFFFF';
      }
      
      return `
        <w:tr>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешний' : result.zoneNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ','))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.loggerName)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(result.serialNumber)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(recoveryData.time)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${complianceColor}"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(recoveryData.meetsCriterion)}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
    }).join('');

    return `
      <w:tbl>
        <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>
        <w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/><w:gridCol w:w="4000"/><w:gridCol w:w="2000"/></w:tblGrid>
        ${headerRow}${dataRows}
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
   * Обработка плейсхолдеров в колонтитулах
   */
  private async processHeaderFooterPlaceholders(zip: JSZip, data: TemplateReportData): Promise<void> {
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
      
      for (const fileName of headerFooterFiles) {
        const file = zip.file(fileName);
        if (file) {
          console.log(`Обрабатываем файл колонтитула: ${fileName}`);
          
          try {
            // Читаем содержимое файла колонтитула
            const headerFooterXml = await file.async('string');
            
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
      }
      
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
      // Все выводы формируются с размером шрифта 12 (Times New Roman 12pt)
      const formattedConclusions = this.convertHtmlBoldToDocx(data.conclusions, true);
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
          ${formattedConclusions}
        </w:p>`;
    }

    return chartImage + resultsTable + conclusions;
  }


  /**
   * Обновление связей документа для нового изображения
   */
  private async updateDocumentRelations(zip: any, imageId: string): Promise<void> {
    try {
      // Получаем текущие связи
      const relsFile = 'word/_rels/document.xml.rels';
      let relsXml = '';
      
      const relsFileObj = zip.file(relsFile);
      if (relsFileObj) {
        relsXml = await relsFileObj.async('string');
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
  private async validateDocxStructure(zip: JSZip): Promise<string[]> {
    const requiredFiles = [
      '[Content_Types].xml',
      'word/document.xml',
      'word/_rels/document.xml.rels'
    ];
    
    const errors: string[] = [];
    
    // Проверяем наличие обязательных файлов
    for (const file of requiredFiles) {
      if (!zip.file(file)) {
        errors.push(`Missing required file: ${file}`);
      }
    }
    
    // Проверка XML валидности
    const documentFile = zip.file('word/document.xml');
    if (documentFile) {
      try {
        const xmlContent = await documentFile.async('string');
        
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
      const buffer = await templateFile.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await this.safeReadDocumentXml(zip, 'word/document.xml', buffer);
      
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
      console.log('🔍 Начало валидации шаблона:', {
        name: templateFile.name,
        size: templateFile.size,
        type: templateFile.type,
        lastModified: templateFile.lastModified
      });

      // Проверяем расширение файла
      if (!templateFile.name.toLowerCase().endsWith('.docx')) {
        console.warn('❌ Неверное расширение файла:', templateFile.name);
        return {
          isValid: false,
          errors: ['Файл должен иметь расширение .docx']
        };
      }

      // Проверяем размер файла
      if (templateFile.size === 0) {
        console.warn('❌ Файл пустой');
        return {
          isValid: false,
          errors: ['Файл пустой']
        };
      }

      // Читаем файл как ArrayBuffer
      let buffer: ArrayBuffer;
      try {
        buffer = await templateFile.arrayBuffer();
        console.log('✅ Файл прочитан в ArrayBuffer, размер:', buffer.byteLength, 'байт');
      } catch (readError) {
        console.error('❌ Ошибка чтения файла:', readError);
        return {
          isValid: false,
          errors: [`Ошибка чтения файла: ${readError instanceof Error ? readError.message : String(readError)}`]
        };
      }

      // Проверяем, что это валидный ZIP архив (DOCX)
      try {
        // Проверяем минимальный размер файла (DOCX должен быть ZIP архивом)
        if (buffer.byteLength < 22) { // Минимальный размер ZIP заголовка
          console.error('❌ Файл слишком мал для DOCX архива');
          return {
            isValid: false,
            errors: ['Файл слишком мал или поврежден. DOCX файл должен быть ZIP архивом.']
          };
        }

        // Проверяем сигнатуру ZIP (PK - начало ZIP файла)
        const uint8Array = new Uint8Array(buffer.slice(0, 4));
        const signature = String.fromCharCode(...uint8Array);
        if (signature !== 'PK\x03\x04' && signature !== 'PK\x05\x06' && signature !== 'PK\x07\x08') {
          console.warn('⚠️ Файл не начинается с ZIP сигнатуры, но попробуем обработать...');
        }

        let zip: JSZip;
        try {
          // Загружаем ZIP архив через JSZip
          zip = await JSZip.loadAsync(buffer);
        } catch (jszipError) {
          console.error('❌ Ошибка создания JSZip объекта:', jszipError);
          return {
            isValid: false,
            errors: [`Не удалось открыть файл как ZIP архив. Возможно, файл поврежден или не является DOCX документом. Ошибка: ${jszipError instanceof Error ? jszipError.message : String(jszipError)}`]
          };
        }

        // Проверяем, что архив содержит файлы
        const fileCount = Object.keys(zip.files).length;
        console.log('✅ ZIP архив создан, файлов в архиве:', fileCount);
        
        if (fileCount === 0) {
          console.error('❌ ZIP архив пуст');
          return {
            isValid: false,
            errors: ['ZIP архив пуст. Файл поврежден или не является DOCX документом.']
          };
        }
        
        // Проверяем наличие основных файлов DOCX
        const requiredFiles = [
          'word/document.xml',
          '[Content_Types].xml'
        ];
        
        const missingFiles = requiredFiles.filter(file => !zip.file(file));
        if (missingFiles.length > 0) {
          console.warn('❌ Отсутствуют обязательные файлы:', missingFiles);
          console.log('Доступные файлы в архиве:', Object.keys(zip.files).slice(0, 10));
          return {
            isValid: false,
            errors: [`Файл не является корректным DOCX документом. Отсутствуют: ${missingFiles.join(', ')}`]
          };
        }

        // Читаем содержимое документа
        try {
          const documentFile = zip.file('word/document.xml');
          
          // Проверяем, что файл существует и доступен
          if (!documentFile) {
            console.error('❌ Файл word/document.xml не найден в архиве');
            return {
              isValid: false,
              errors: ['Файл word/document.xml не найден в DOCX архиве']
            };
          }

          // Пытаемся прочитать содержимое используя безопасный метод
          // Передаем исходный буфер для чтения несжатых файлов
          const documentXml = await this.safeReadDocumentXml(zip, 'word/document.xml', buffer);
          
          // Логируем информацию о файле для диагностики
          console.log('🔍 Информация о файле:', {
            name: documentFile.name,
            dir: documentFile.dir
          });
          
          if (!documentXml || typeof documentXml !== 'string') {
            console.error('❌ Не удалось прочитать содержимое document.xml');
            return {
              isValid: false,
              errors: ['Не удалось прочитать содержимое файла word/document.xml']
            };
          }

          console.log('✅ document.xml прочитан, размер:', documentXml.length, 'символов');
          
          return {
            isValid: true,
            errors: []
          };
        } catch (xmlError) {
          console.error('❌ Ошибка чтения document.xml:', xmlError);
          console.error('Детали ошибки:', {
            message: xmlError instanceof Error ? xmlError.message : String(xmlError),
            name: xmlError instanceof Error ? xmlError.name : 'Unknown',
            stack: xmlError instanceof Error ? xmlError.stack : undefined
          });
          
          // Проверяем, что файл существует в архиве
          const availableFiles = Object.keys(zip.files).filter(f => f.includes('document.xml'));
          console.log('Доступные файлы document.xml в архиве:', availableFiles);
          
          return {
            isValid: false,
            errors: [`Ошибка чтения содержимого документа: ${xmlError instanceof Error ? xmlError.message : String(xmlError)}`]
          };
        }

      } catch (zipError) {
        console.error('❌ Ошибка создания ZIP архива:', zipError);
        console.error('Детали ошибки:', {
          message: zipError instanceof Error ? zipError.message : String(zipError),
          name: zipError instanceof Error ? zipError.name : 'Unknown',
          stack: zipError instanceof Error ? zipError.stack : undefined
        });
        return {
          isValid: false,
          errors: [`Не удалось прочитать DOCX файл. Возможно, файл поврежден. Ошибка: ${zipError instanceof Error ? zipError.message : String(zipError)}`]
        };
      }

    } catch (error) {
      console.error('❌ Общая ошибка валидации шаблона:', error);
      return {
        isValid: false,
        errors: [`Ошибка при проверке файла шаблона: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }
}