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
          reportData,
          chartElement
        );
        finalBlob = result.blob;
        finalFileName = result.fileName;
      } else {
        // Создаем новый отчет
        console.log('Создаем новый отчет');
        finalBlob = await this.createNewReport(templateZip, reportData, chartElement);
        finalFileName = fileName;
      }

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
                        <a:blip r:embed="rIdChart"/>
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
      // Правильное преобразование base64 в binary данные для браузера
      const binaryString = atob(this.currentChartImageData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Создаем структуру папок word/media
      let wordFolder = zip.folder('word');
      if (!wordFolder) {
        wordFolder = zip.folder('word');
      }
      
      let mediaFolder = wordFolder?.folder('media');
      if (!mediaFolder) {
        mediaFolder = wordFolder?.folder('media');
      }

      // Добавляем изображение в word/media/chart.png
      zip.file('word/media/chart.png', bytes);

      // Обязательно обновляем relationships и content types
      await this.updateDocumentRelationships(zip);
      await this.updateContentTypes(zip);

    } catch (error) {
      console.error('Ошибка добавления изображения в DOCX:', error);
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
      const newRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>
</Relationships>`;
      zip.file(relsPath, newRels);
      return;
    }

    try {
      let relsXml = await relsFile.async('text');
      
      // Проверяем, есть ли уже связь с изображением
      if (!relsXml.includes('rIdChart')) {
        relsXml = relsXml.replace(
          '</Relationships>',
          `  <Relationship Id="rIdChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>\n</Relationships>`
        );
        zip.file(relsPath, relsXml);
      }
    } catch (error) {
      console.error('Ошибка обновления relationships:', error);
    }
  }

  /**
   * Обновление [Content_Types].xml для поддержки PNG
   */
  private async updateContentTypes(zip: JSZip): Promise<void> {
    try {
      const contentTypesFile = zip.file('[Content_Types].xml');
      if (!contentTypesFile) throw new Error('Content Types not found');

      let contentTypesXml = await contentTypesFile.async('text');
      
      // Добавляем тип PNG, если его нет
      if (!contentTypesXml.includes('image/png')) {
        contentTypesXml = contentTypesXml.replace(
          '</Types>',
          '  <Default Extension="png" ContentType="image/png"/>\n</Types>'
        );
        
        // Сохраняем обновленный файл
        zip.file('[Content_Types].xml', contentTypesXml);
      }
    } catch (error) {
      console.error('Content Types update failed:', error);
    }
  }
}