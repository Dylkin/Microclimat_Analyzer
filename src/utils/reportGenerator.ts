import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import officegen from 'officegen';

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
    chartData?: ChartDataPoint[]
  ): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      console.log('Начинаем генерацию отчета...');
      console.log('Используем шаблон:', templateFile.name);
      
      // Генерируем имя файла
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Отчет_${reportData.reportNumber || 'без_номера'}_${timestamp}.docx`;

      // Читаем шаблон
      const templateBuffer = await templateFile.arrayBuffer();
      const templateZip = await JSZip.loadAsync(templateBuffer);
      console.log('Шаблон успешно загружен и распакован');


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
          reportData
        );
        finalBlob = result.blob;
        finalFileName = result.fileName;
      } else {
        // Создаем новый отчет
        console.log('Создаем новый отчет');
        finalBlob = await this.createNewReport(templateZip, reportData, chartData);
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
    reportData: any
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
      const newReportZip = await this.processTemplate(newTemplateZip, reportData);
      
      // Добавляем график если есть данные
      if (chartData && chartData.length > 0) {
        await this.addChartToZip(newReportZip, chartData, reportData.dataType || 'temperature');
      }
      
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
      const blob = await this.createNewReport(newTemplateZip, reportData, chartData);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Отчет_${reportData.reportNumber || 'без_номера'}_${timestamp}.docx`;
      return { blob, fileName };
    }
  }


  private async createNewReport(
    templateZip: JSZip,
    reportData: any,
    chartData?: ChartDataPoint[]
  ): Promise<Blob> {
    const processedZip = await this.processTemplate(templateZip, reportData);
    
    // Добавляем график если есть данные
    if (chartData && chartData.length > 0) {
      await this.addChartToZip(processedZip, chartData, reportData.dataType || 'temperature');
    }
    
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
    imageFileName: string = 'media.png'
  ): Promise<JSZip> {
    const zip = templateZip.clone();

    // Читаем document.xml
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Не найден document.xml в шаблоне');
    }

    // Заменяем плейсхолдеры
    let processedXml = this.replacePlaceholders(documentXml, reportData);


    // Сохраняем обновленный document.xml
    zip.file('word/document.xml', processedXml);

    // Обрабатываем нижний колонтитул
    await this.processFooter(zip, reportData);
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

  /**
   * Создание изображения графика с помощью Canvas и добавление в ZIP
   */
  private async addChartToZip(
    zip: JSZip, 
    chartData: ChartDataPoint[], 
    dataType: 'temperature' | 'humidity'
  ): Promise<void> {
    try {
      console.log('Генерируем изображение графика...');
      
      // Создаем изображение графика
      const chartImageBuffer = await this.generateChartImage(chartData, {
        width: 1200,
        height: 800,
        dataType,
        title: `График ${dataType === 'temperature' ? 'температуры' : 'влажности'}`,
        yAxisLabel: dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)'
      });
      
      // Поворачиваем изображение на 90° против часовой стрелки
      const rotatedImageBuffer = await this.rotateImage(chartImageBuffer, -90);
      
      // Добавляем изображение в архив
      zip.file('word/media/chart.png', rotatedImageBuffer);
      
      // Обновляем relationships
      await this.updateDocumentRelationships(zip);
      
      console.log('График успешно добавлен в отчет');
      
    } catch (error) {
      console.error('Ошибка добавления графика:', error);
      // Не прерываем генерацию отчета из-за ошибки графика
    }
  }

  /**
   * Генерация изображения графика с помощью Canvas
   */
  private async generateChartImage(
    data: ChartDataPoint[], 
    options: ChartGenerationOptions
  ): Promise<Buffer> {
    // Импортируем canvas динамически
    const { createCanvas } = await import('canvas');
    
    const { width, height, dataType, title, yAxisLabel } = options;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Настройки отступов
    const margin = { top: 60, right: 80, bottom: 80, left: 100 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Очищаем canvas белым фоном
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Фильтруем данные по типу
    const filteredData = data.filter(d => {
      const value = dataType === 'temperature' ? d.temperature : d.humidity;
      return value !== undefined;
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    if (filteredData.length === 0) {
      // Рисуем сообщение об отсутствии данных
      ctx.fillStyle = '#666666';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Нет данных для отображения', width / 2, height / 2);
      return canvas.toBuffer('image/png');
    }
    
    // Определяем диапазоны данных
    const values = filteredData.map(d => dataType === 'temperature' ? d.temperature! : d.humidity!);
    const timestamps = filteredData.map(d => d.timestamp);
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // Добавляем отступы к диапазону значений
    const valueRange = maxValue - minValue;
    const valuePadding = valueRange * 0.1;
    const adjustedMinValue = minValue - valuePadding;
    const adjustedMaxValue = maxValue + valuePadding;
    
    // Функции масштабирования
    const scaleX = (timestamp: number) => 
      margin.left + ((timestamp - minTime) / (maxTime - minTime)) * chartWidth;
    const scaleY = (value: number) => 
      margin.top + chartHeight - ((value - adjustedMinValue) / (adjustedMaxValue - adjustedMinValue)) * chartHeight;
    
    // Рисуем заголовок
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 35);
    
    // Рисуем оси
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Ось Y
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    // Ось X
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
    
    // Рисуем сетку и подписи оси Y
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    
    const yTicks = 8;
    for (let i = 0; i <= yTicks; i++) {
      const value = adjustedMinValue + (adjustedMaxValue - adjustedMinValue) * (i / yTicks);
      const y = scaleY(value);
      
      // Сетка
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
      
      // Подпись
      ctx.fillText(value.toFixed(1), margin.left - 10, y + 5);
    }
    
    // Рисуем подписи оси X
    ctx.textAlign = 'center';
    const xTicks = 6;
    for (let i = 0; i <= xTicks; i++) {
      const timestamp = minTime + (maxTime - minTime) * (i / xTicks);
      const x = scaleX(timestamp);
      const date = new Date(timestamp);
      
      // Вертикальная сетка
      ctx.strokeStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();
      
      // Подпись даты
      ctx.fillStyle = '#666666';
      const dateStr = date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      ctx.save();
      ctx.translate(x, margin.top + chartHeight + 20);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(dateStr, 0, 0);
      ctx.restore();
    }
    
    // Группируем данные по файлам
    const dataByFile = new Map<string, ChartDataPoint[]>();
    filteredData.forEach(point => {
      if (!dataByFile.has(point.fileId)) {
        dataByFile.set(point.fileId, []);
      }
      dataByFile.get(point.fileId)!.push(point);
    });
    
    // Цвета для разных файлов
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    // Рисуем линии для каждого файла
    Array.from(dataByFile.entries()).forEach(([fileId, fileData], index) => {
      const color = colors[index % colors.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      fileData.forEach((point, i) => {
        const value = dataType === 'temperature' ? point.temperature! : point.humidity!;
        const x = scaleX(point.timestamp);
        const y = scaleY(value);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Рисуем точки
      ctx.fillStyle = color;
      fileData.forEach(point => {
        const value = dataType === 'temperature' ? point.temperature! : point.humidity!;
        const x = scaleX(point.timestamp);
        const y = scaleY(value);
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
    
    // Подпись оси Y
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
    
    // Подпись оси X
    ctx.textAlign = 'center';
    ctx.fillText('Время', width / 2, height - 20);
    
    return canvas.toBuffer('image/png');
  }

  /**
   * Поворот изображения на заданный угол
   */
  private async rotateImage(imageBuffer: Buffer, angle: number): Promise<Buffer> {
    const { createCanvas, loadImage } = await import('canvas');
    
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.height, image.width); // Меняем местами для поворота на 90°
    const ctx = canvas.getContext('2d');
    
    // Поворачиваем на 90° против часовой стрелки
    ctx.translate(0, image.width);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(image, 0, 0);
    
    return canvas.toBuffer('image/png');
  }

  /**
   * Обновление relationships для добавления изображения
   */
  private async updateDocumentRelationships(zip: JSZip): Promise<void> {
    try {
      const relsFile = zip.file('word/_rels/document.xml.rels');
      if (!relsFile) {
        console.warn('Файл relationships не найден');
        return;
      }
      
      let relsXml = await relsFile.async('text');
      
      // Добавляем relationship для изображения если его еще нет
      if (!relsXml.includes('rId999')) {
        const newRelationship = '<Relationship Id="rId999" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>';
        relsXml = relsXml.replace('</Relationships>', `  ${newRelationship}\n</Relationships>`);
        zip.file('word/_rels/document.xml.rels', relsXml);
      }
      
    } catch (error) {
      console.error('Ошибка обновления relationships:', error);
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

  private replacePlaceholders(xml: string, data: any): string {
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

    // Заменяем плейсхолдер графика на текст
    result = result.replace('{chart}', '<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="6858000" cy="4572000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Chart"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="chart.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId999"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6858000" cy="4572000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>');

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