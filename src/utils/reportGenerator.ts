import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { UploadedFile } from '../types/FileData';
import { AuthUser } from '../types/User';
import { ChartLimits, VerticalMarker } from '../types/TimeSeriesData';

interface ReportData {
  reportNumber: string;
  reportDate: string;
  objectName: string;
  climateSystemName: string;
  testType: string;
  limits: ChartLimits;
  markers: VerticalMarker[];
  resultsTableData: any[];
  conclusion: string;
  user: AuthUser;
  director?: string;
  dataType: 'temperature' | 'humidity';
  chartImageData: string;
}

export class ReportGenerator {
  private static instance: ReportGenerator;
  private generatedReports: Map<string, Blob> = new Map();
  private generatedCharts: Map<string, Blob> = new Map();
  private masterReport: Blob | null = null;
  private masterReportName: string | null = null;

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  /**
   * Генерация отчета на основе загруженного DOCX шаблона
   */
  async generateReport(
    templateFile: File,
    reportData: ReportData,
    chartElement?: HTMLElement
  ): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      console.log('Начинаем генерацию отчета с docx.js...');

      // Читаем содержимое шаблона
      const templateBuffer = await templateFile.arrayBuffer();
      console.log('Шаблон загружен, размер:', templateBuffer.byteLength, 'байт');

      // Определяем имя файла для отчета - всегда используем мастер-отчет если он существует
      let fileName: string;
      let baseDocument: ArrayBuffer;
      
      if (this.masterReport && this.masterReportName) {
        // Используем существующий мастер-отчет как основу
        fileName = this.masterReportName;
        baseDocument = await this.masterReport.arrayBuffer();
        console.log('Добавляем данные в существующий отчет:', fileName);
      } else {
        // Создаем новый отчет
        fileName = `Отчет_${reportData.reportNumber}_${new Date().toISOString().split('T')[0]}.docx`;
        this.masterReportName = fileName;
        baseDocument = templateBuffer;
        console.log('Создаем новый отчет:', fileName);
      }

      // Определяем имя файла для графика
      const chartFileName = fileName.replace('.docx', '_график.png');

      // Получаем изображение графика если элемент предоставлен
      let chartImageBuffer: ArrayBuffer | null = null;
      
      if (chartElement) {
        try {
          // Создаем контейнер для графика с заголовком и легендой
          const chartContainer = document.createElement('div');
          chartContainer.style.width = '900px';
          chartContainer.style.height = '675px';
          chartContainer.style.backgroundColor = '#ffffff';
          chartContainer.style.padding = '20px';
          chartContainer.style.fontFamily = 'Arial, sans-serif';
          
          // Добавляем заголовок
          const title = document.createElement('div');
          title.style.fontSize = '18px';
          title.style.fontWeight = 'bold';
          title.style.textAlign = 'center';
          title.style.marginBottom = '15px';
          title.style.color = '#333333';
          title.textContent = `График ${reportData.dataType === 'temperature' ? 'температуры' : 'влажности'}`;
          chartContainer.appendChild(title);
          
          // Клонируем оригинальный график
          const chartClone = chartElement.cloneNode(true) as HTMLElement;
          chartClone.style.width = '860px';
          chartClone.style.height = '580px';
          chartContainer.appendChild(chartClone);
          
          // Добавляем легенду (если есть несколько файлов)
          const legendElement = chartElement.querySelector('.mb-4.p-3.bg-gray-50.rounded-lg');
          if (legendElement) {
            const legendClone = legendElement.cloneNode(true) as HTMLElement;
            legendClone.style.marginTop = '10px';
            legendClone.style.fontSize = '12px';
            chartContainer.appendChild(legendClone);
          }
          
          // Временно добавляем контейнер в DOM
          document.body.appendChild(chartContainer);
          
          // Захватываем изображение контейнера
          const captureOptions = {
            backgroundColor: '#ffffff',
            scale: 1,
            useCORS: true,
            allowTaint: true,
            width: 900,
            height: 675
          };

          const canvas = await html2canvas(chartContainer, captureOptions);
          
          // Удаляем временный контейнер
          document.body.removeChild(chartContainer);
          
          console.log('График успешно конвертирован в canvas');
          console.log('Размер исходного canvas:', canvas.width, 'x', canvas.height);
          
          // Создаем новый canvas для поворота изображения на 90 градусов против часовой стрелки
          const rotatedCanvas = document.createElement('canvas');
          const rotatedCtx = rotatedCanvas.getContext('2d');
          
          if (rotatedCtx) {
            // Устанавливаем размеры повернутого canvas 675x900 пикселей
            rotatedCanvas.width = 675;
            rotatedCanvas.height = 900;
            
            console.log('Размер повернутого canvas:', rotatedCanvas.width, 'x', rotatedCanvas.height);
            
            // Перемещаем точку отсчета в центр canvas
            rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
            
            // Поворачиваем на -90 градусов (против часовой стрелки)
            rotatedCtx.rotate(-Math.PI / 2);
            
            // Масштабируем и рисуем исходное изображение с центрированием
            const scale = Math.min(675 / canvas.height, 900 / canvas.width);
            const scaledWidth = canvas.width * scale;
            const scaledHeight = canvas.height * scale;
            
            rotatedCtx.drawImage(canvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
            
            console.log('График повернут на 90 градусов против часовой стрелки');
            
            // Создаем Buffer для PNG файла из повернутого canvas
            const chartBlob = await new Promise<Blob | null>((resolve) => {
              rotatedCanvas.toBlob((blob) => {
                resolve(blob);
              }, 'image/png');
            });
            
            if (chartBlob) {
              chartImageBuffer = await chartBlob.arrayBuffer();
              
              // Сохраняем график для отдельного скачивания
              this.generatedCharts.set(chartFileName, chartBlob);
              console.log('Повернутый график сохранен как:', chartFileName);
            }
          } else {
            console.warn('Не удалось получить контекст для поворота изображения, используем исходный график');
            // Fallback: используем исходный canvas
            const chartBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => {
                resolve(blob);
              }, 'image/png');
            });
            
            if (chartBlob) {
              chartImageBuffer = await chartBlob.arrayBuffer();
              this.generatedCharts.set(chartFileName, chartBlob);
            }
          }
        } catch (error) {
          console.warn('Ошибка поворота графика, используем исходный:', error);
          // Создаем Buffer для PNG файла
          const captureOptions = {
            backgroundColor: '#ffffff',
            scale: 1,
            useCORS: true,
            allowTaint: true,
            width: 900,
            height: 675
          };
          const canvas = await html2canvas(chartElement, captureOptions);
          const chartBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob);
            }, 'image/png');
          });
          
          if (chartBlob) {
            chartImageBuffer = await chartBlob.arrayBuffer();
            
            // Сохраняем график для отдельного скачивания
            this.generatedCharts.set(chartFileName, chartBlob);
            console.log('График сохранен как:', chartFileName);
          }
        }
      }

      // Обрабатываем шаблон и заменяем плейсхолдеры
      const processedDoc = await this.processTemplate(baseDocument, reportData, chartImageBuffer);

      // Генерируем итоговый документ
      const output = processedDoc;

      console.log('Отчет успешно сгенерирован с docx.js');
      
      // Сохраняем как мастер-отчет для последующих добавлений
      this.masterReport = output;
      this.generatedReports.set(fileName, output);

      // Скачиваем файл
      saveAs(output, fileName);

      console.log('Отчет успешно сгенерирован:', fileName);

      return {
        success: true,
        fileName
      };

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
   * Обработка шаблона DOCX и замена плейсхолдеров
   */
  private async processTemplate(documentBuffer: ArrayBuffer, reportData: ReportData, chartImageBuffer: ArrayBuffer | null): Promise<Blob> {
    try {
      // Читаем шаблон как ZIP архив
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(documentBuffer);
      
      // Получаем основной документ
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (!documentXml) {
        throw new Error('Не удалось найти document.xml в шаблоне');
      }

      // Если это существующий отчет, добавляем новую секцию
      let processedXml = documentXml;
      
      if (this.masterReport && this.masterReportName) {
        // Добавляем разрыв страницы и новую секцию отчета
        processedXml = this.addNewReportSection(processedXml, reportData, chartImageBuffer, zip);
      } else {
        // Обычная обработка для нового отчета
        processedXml = await this.processNewReport(processedXml, reportData, chartImageBuffer, zip);
      }

      // Обновляем document.xml в архиве
      zip.file('word/document.xml', processedXml);

      // Генерируем итоговый файл
      return await zip.generateAsync({ type: 'blob' });
      
    } catch (error) {
      console.error('Ошибка обработки шаблона:', error);
      // Fallback: создаем документ с нуля
      return await this.createFallbackDocument(reportData, chartImageBuffer);
    }
  }

  /**
   * Добавление новой секции отчета в существующий документ
   */
  private async addNewReportSection(documentXml: string, reportData: ReportData, chartImageBuffer: ArrayBuffer | null, zip: any): Promise<string> {
    try {
      // Находим конец документа (перед закрывающим тегом </w:body>)
      const bodyEndIndex = documentXml.lastIndexOf('</w:body>');
      
      if (bodyEndIndex === -1) {
        throw new Error('Не удалось найти конец документа');
      }

      // Создаем новую секцию отчета на основе шаблона
      const newSectionXml = await this.generateNewReportSectionFromTemplate(reportData, chartImageBuffer, zip);
      
      // Вставляем новую секцию перед закрывающим тегом body
      const beforeBody = documentXml.substring(0, bodyEndIndex);
      const afterBody = documentXml.substring(bodyEndIndex);
      
      return beforeBody + newSectionXml + afterBody;
      
    } catch (error) {
      console.error('Ошибка добавления новой секции:', error);
      // Fallback: обрабатываем как новый отчет
      return await this.processNewReport(documentXml, reportData, chartImageBuffer, zip);
    }
  }

  /**
   * Генерация XML для новой секции отчета на основе шаблона
   */
  private async generateNewReportSectionFromTemplate(reportData: ReportData, chartImageBuffer: ArrayBuffer | null, zip: any): Promise<string> {
    const replacements = this.prepareReplacements(reportData);
    
    // Создаем базовую структуру секции с плейсхолдерами
    let sectionXml = `
      <!-- Разрыв страницы -->
      <w:p>
        <w:r>
          <w:br w:type="page"/>
        </w:r>
      </w:p>
      
      <!-- Новая секция отчета -->
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="32"/>
          </w:rPr>
          <w:t>ОТЧЕТ № {Report No.}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:sz w:val="24"/>
          </w:rPr>
          <w:t>от {Report date}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="28"/>
          </w:rPr>
          <w:t>О РЕЗУЛЬТАТАХ ИСПЫТАНИЙ МИКРОКЛИМАТА</w:t>
        </w:r>
      </w:p>
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>1. ОБЩИЕ СВЕДЕНИЯ</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Объект исследования: </w:t>
        </w:r>
        <w:r>
          <w:t>{name of the object}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Климатическая установка: </w:t>
        </w:r>
        <w:r>
          <w:t>{name of the air conditioning system}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Вид испытания: </w:t>
        </w:r>
        <w:r>
          <w:t>{name of the test}</w:t>
        </w:r>
      </w:p>
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>2. КРИТЕРИИ ПРИЕМКИ</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:t>{acceptance criteria}</w:t>
        </w:r>
      </w:p>
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>3. ПЕРИОД ПРОВЕДЕНИЯ ИСПЫТАНИЙ</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Начало испытания: </w:t>
        </w:r>
        <w:r>
          <w:t>{Date time of test start}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Завершение испытания: </w:t>
        </w:r>
        <w:r>
          <w:t>{Date time of test completion}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Длительность испытания: </w:t>
        </w:r>
        <w:r>
          <w:t>{Duration of the test}</w:t>
        </w:r>
      </w:p>
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>4. РЕЗУЛЬТАТЫ ИЗМЕРЕНИЙ</w:t>
        </w:r>
      </w:p>
      
      {Results table}
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>5. ГРАФИЧЕСКОЕ ПРЕДСТАВЛЕНИЕ ДАННЫХ</w:t>
        </w:r>
      </w:p>
      
      {chart}
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>6. ЗАКЛЮЧЕНИЕ</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:t>{Result}</w:t>
        </w:r>
      </w:p>
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>7. ИСПОЛНИТЕЛИ</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Исполнитель: </w:t>
        </w:r>
        <w:r>
          <w:t>{executor}</w:t>
        </w:r>
      </w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Руководитель: </w:t>
        </w:r>
        <w:r>
          <w:t>{director}</w:t>
        </w:r>
      </w:p>
      
      <w:p><w:r><w:t></w:t></w:r></w:p>
      
      <w:p>
        <w:r>
          <w:rPr><w:b/></w:rPr>
          <w:t>Дата составления отчета: </w:t>
        </w:r>
        <w:r>
          <w:t>{test date}</w:t>
        </w:r>
      </w:p>
    `;
    
    // Теперь заменяем плейсхолдеры на реальные данные
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
      sectionXml = sectionXml.replace(regex, this.escapeXml(value));
    }

    // Обрабатываем специальные плейсхолдеры
    sectionXml = await this.processSpecialPlaceholders(sectionXml, reportData, chartImageBuffer, zip);
    
    return sectionXml;
  }

  /**
   * Обработка нового отчета (обычная замена плейсхолдеров)
   */
  private async processNewReport(documentXml: string, reportData: ReportData, chartImageBuffer: ArrayBuffer | null, zip: any): Promise<string> {
    // Подготавливаем данные для замены
    const replacements = this.prepareReplacements(reportData);
    
    // Заменяем плейсхолдеры в XML
    let processedXml = documentXml;
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
      processedXml = processedXml.replace(regex, this.escapeXml(value));
    }

    // Обрабатываем специальные плейсхолдеры
    processedXml = await this.processSpecialPlaceholders(processedXml, reportData, chartImageBuffer, zip);

    return processedXml;
  }

  /**
   * Обработка специальных плейсхолдеров (таблица и график) - восстановленный метод
   */
  private async processSpecialPlaceholders(
    xml: string, 
    reportData: ReportData, 
    chartImageBuffer: ArrayBuffer | null, 
    zip: any
  ): Promise<string> {
    let processedXml = xml;

    // Замена плейсхолдера таблицы результатов
    if (reportData.resultsTableData && reportData.resultsTableData.length > 0) {
      const tableXml = this.generateTableXml(reportData.resultsTableData);
      processedXml = processedXml.replace(/\{Results table\}/g, tableXml);
    } else {
      processedXml = processedXml.replace(/\{Results table\}/g, 'Данные для таблицы результатов отсутствуют');
    }

    // Замена плейсхолдера графика
    if (chartImageBuffer) {
      const chartXml = await this.generateChartXml(chartImageBuffer, zip);
      processedXml = processedXml.replace(/\{chart\}/g, chartXml);
    } else {
      processedXml = processedXml.replace(/\{chart\}/g, 'График не был сгенерирован');
    }

    return processedXml;
  }

  /**
   * Подготовка данных для замены плейсхолдеров
   */
  private prepareReplacements(reportData: ReportData): Record<string, string> {
    const testTypes = {
      'empty-object': 'Соответствие критериям в пустом объекте',
      'loaded-object': 'Соответствие критериям в загруженном объекте',
      'door-opening': 'Открытие двери',
      'power-off': 'Отключение электропитания',
      'power-on': 'Включение электропитания'
    };

    const testPeriodInfo = this.getTestPeriodInfo(reportData.markers);
    const acceptanceCriteria = this.formatAcceptanceCriteria(reportData.limits);

    return {
      'Report No.': reportData.reportNumber || 'Не указан',
      'Report date': reportData.reportDate ? new Date(reportData.reportDate).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
      'name of the object': reportData.objectName || 'Не указано',
      'name of the air conditioning system': reportData.climateSystemName || 'Не указано',
      'name of the test': testTypes[reportData.testType as keyof typeof testTypes] || reportData.testType,
      'acceptance criteria': acceptanceCriteria,
      'Date time of test start': testPeriodInfo?.startTime || 'Не указано',
      'Date time of test completion': testPeriodInfo?.endTime || 'Не указано',
      'Duration of the test': testPeriodInfo?.duration || 'Не указано',
      'Result': reportData.conclusion || 'Выводы не указаны',
      'executor': reportData.user.fullName || 'Не указано',
      'director': reportData.director || 'Не указано',
      'test date': new Date().toLocaleDateString('ru-RU')
    };
  }

  /**
   * Генерация XML для таблицы результатов
   */
  private generateTableXml(resultsTableData: any[]): string {
    // Находим глобальные минимальные и максимальные значения (исключая внешние датчики)
    const nonExternalMinValues = resultsTableData
      .filter(row => !row.isExternal)
      .map(row => parseFloat(row.minTemp))
      .filter(val => !isNaN(val));
    
    const nonExternalMaxValues = resultsTableData
      .filter(row => !row.isExternal)
      .map(row => parseFloat(row.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = nonExternalMinValues.length > 0 ? Math.min(...nonExternalMinValues) : null;
    const globalMaxTemp = nonExternalMaxValues.length > 0 ? Math.max(...nonExternalMaxValues) : null;

    let tableXml = `
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
        <w:tr>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>№ зоны измерения</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Уровень измерения (м.)</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Наименование логгера</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Серийный № логгера</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Мин. t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Макс. t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Среднее t°C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Соответствие лимитам</w:t></w:r></w:p></w:tc>
        </w:tr>`;

    resultsTableData.forEach(row => {
      const minTempValue = parseFloat(row.minTemp);
      const maxTempValue = parseFloat(row.maxTemp);
      
      const isGlobalMin = !row.isExternal && !isNaN(minTempValue) && globalMinTemp !== null && minTempValue === globalMinTemp;
      const isGlobalMax = !row.isExternal && !isNaN(maxTempValue) && globalMaxTemp !== null && maxTempValue === globalMaxTemp;

      const minTempShading = isGlobalMin ? '<w:shd w:val="clear" w:color="auto" w:fill="ADD8E6"/>' : '';
      const maxTempShading = isGlobalMax ? '<w:shd w:val="clear" w:color="auto" w:fill="FFB6C1"/>' : '';

      tableXml += `
        <w:tr>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(String(row.zoneNumber || '-'))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(String(row.measurementLevel || '-'))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(String(row.loggerName || '-'))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(String(row.serialNumber || '-'))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr>${minTempShading}</w:tcPr><w:p><w:r><w:t>${this.escapeXml(String(row.minTemp))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr>${maxTempShading}</w:tcPr><w:p><w:r><w:t>${this.escapeXml(String(row.maxTemp))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(String(row.avgTemp))}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>${this.escapeXml(String(row.meetsLimits || '-'))}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
    });

    tableXml += '</w:tbl>';
    return tableXml;
  }

  /**
   * Генерация XML для вставки графика
   */
  private async generateChartXml(chartImageBuffer: ArrayBuffer, zip: any): Promise<string> {
    // Добавляем изображение в архив
    const imageId = 'chart1';
    const imagePath = `word/media/${imageId}.png`;
    zip.file(imagePath, chartImageBuffer);

    // Обновляем relationships
    const relsPath = 'word/_rels/document.xml.rels';
    let relsXml = await zip.file(relsPath)?.async('text') || '';
    
    if (!relsXml.includes(`media/${imageId}.png`)) {
      const relationshipId = `rId${Date.now()}`;
      const newRelationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageId}.png"/>`;
      relsXml = relsXml.replace('</Relationships>', newRelationship + '</Relationships>');
      zip.file(relsPath, relsXml);
    }

    // Генерируем XML для изображения с размером 675x900 пикселей
    const widthEmu = 675 * 9525; // Конвертация пикселей в EMU
    const heightEmu = 900 * 9525;

    return `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
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
                      <a:blip r:embed="rId${Date.now()}"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
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
   * Создание документа с нуля (fallback)
   */
  private async createFallbackDocument(reportData: ReportData, chartImageBuffer: ArrayBuffer | null): Promise<Blob> {
    // Получаем информацию о временном периоде
    const testPeriodInfo = this.getTestPeriodInfo(reportData.markers);
    
    // Формируем критерии приемки
    const acceptanceCriteria = this.formatAcceptanceCriteria(reportData.limits);

    // Получаем тип испытания
    const testTypes = {
      'empty-object': 'Соответствие критериям в пустом объекте',
      'loaded-object': 'Соответствие критериям в загруженном объекте',
      'door-opening': 'Открытие двери',
      'power-off': 'Отключение электропитания',
      'power-on': 'Включение электропитания'
    };

    const children = [];

    // Заголовок отчета
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `ОТЧЕТ № ${reportData.reportNumber || 'Не указан'}`,
            bold: true,
            size: 32
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `от ${reportData.reportDate ? new Date(reportData.reportDate).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU')}`,
            size: 24
          })
        ],
        alignment: AlignmentType.CENTER
      })
    );

    // Пустая строка
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

    // Основная информация
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Объект исследования: ', bold: true }),
          new TextRun({ text: reportData.objectName || 'Не указано' })
        ]
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Климатическая установка: ', bold: true }),
          new TextRun({ text: reportData.climateSystemName || 'Не указано' })
        ]
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Вид испытания: ', bold: true }),
          new TextRun({ text: testTypes[reportData.testType as keyof typeof testTypes] || reportData.testType })
        ]
      })
    );

    // Пустая строка
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

    // Критерии приемки
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Критерии приемки:', bold: true })],
        heading: HeadingLevel.HEADING_2
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: acceptanceCriteria })]
      })
    );

    // Временные данные
    if (testPeriodInfo) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Период испытания:', bold: true })],
          heading: HeadingLevel.HEADING_2
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Начало: ', bold: true }),
            new TextRun({ text: testPeriodInfo.startTime })
          ]
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Завершение: ', bold: true }),
            new TextRun({ text: testPeriodInfo.endTime })
          ]
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Длительность: ', bold: true }),
            new TextRun({ text: testPeriodInfo.duration })
          ]
        })
      );
    }

    // Таблица результатов
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Результаты измерений:', bold: true })],
        heading: HeadingLevel.HEADING_2
      })
    );

    // Создаем и добавляем таблицу результатов
    if (reportData.resultsTableData && reportData.resultsTableData.length > 0) {
      const resultsTable = this.createResultsTable(reportData.resultsTableData);
      children.push(resultsTable);
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Данные для таблицы результатов отсутствуют' })]
        })
      );
    }

    // График
    if (chartImageBuffer) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'График:', bold: true })],
          heading: HeadingLevel.HEADING_2
        })
      );
      
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      
      // Вставляем изображение с сохранением пропорций
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: chartImageBuffer,
              transformation: {
                width: 675,  // Ширина в пикселях
                height: 900  // Высота в пикселях
              }
            })
          ],
          alignment: AlignmentType.CENTER
        })
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'График:', bold: true })],
          heading: HeadingLevel.HEADING_2
        })
      );
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'График не был сгенерирован' })]
        })
      );
    }

    // Заключение
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Заключение:', bold: true })],
        heading: HeadingLevel.HEADING_2
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: reportData.conclusion || 'Выводы не указаны' })]
      })
    );

    // Подписи
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Исполнитель: ', bold: true }),
          new TextRun({ text: reportData.user.fullName || 'Не указано' })
        ]
      })
    );

    if (reportData.director) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Руководитель: ', bold: true }),
            new TextRun({ text: reportData.director })
          ]
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Дата: ', bold: true }),
          new TextRun({ text: new Date().toLocaleDateString('ru-RU') })
        ]
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children
        }
      ]
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Создание таблицы результатов
   */
  private createResultsTable(resultsTableData: any[]): Table {
    // Находим глобальные минимальные и максимальные значения (исключая внешние датчики)
    const nonExternalMinValues = resultsTableData
      .filter(row => !row.isExternal)
      .map(row => parseFloat(row.minTemp))
      .filter(val => !isNaN(val));
    
    const nonExternalMaxValues = resultsTableData
      .filter(row => !row.isExternal)
      .map(row => parseFloat(row.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = nonExternalMinValues.length > 0 ? Math.min(...nonExternalMinValues) : null;
    const globalMaxTemp = nonExternalMaxValues.length > 0 ? Math.max(...nonExternalMaxValues) : null;

    const rows = [];

    // Заголовок таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: '№ зоны измерения', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Уровень измерения (м.)', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Наименование логгера (6 символов)', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Серийный № логгера', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Мин. t°C', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Макс. t°C', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Среднее t°C', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Соответствие лимитам', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );

    // Данные таблицы
    resultsTableData.forEach(row => {
      // Определяем цвета для ячеек с минимальными и максимальными значениями
      const minTempValue = parseFloat(row.minTemp);
      const maxTempValue = parseFloat(row.maxTemp);
      
      // Выделяем только если это не внешний датчик
      const isGlobalMin = !row.isExternal && !isNaN(minTempValue) && globalMinTemp !== null && minTempValue === globalMinTemp;
      const isGlobalMax = !row.isExternal && !isNaN(maxTempValue) && globalMaxTemp !== null && maxTempValue === globalMaxTemp;

      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.zoneNumber || '-') })],
                alignment: AlignmentType.CENTER
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.measurementLevel || '-') })],
                alignment: AlignmentType.CENTER
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.loggerName || '-') })],
                alignment: AlignmentType.CENTER
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.serialNumber || '-') })],
                alignment: AlignmentType.CENTER
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.minTemp) })],
                alignment: AlignmentType.CENTER
              })],
              shading: isGlobalMin ? {
                fill: "ADD8E6" // Светло-синий цвет
              } : undefined
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.maxTemp) })],
                alignment: AlignmentType.CENTER
              })],
              shading: isGlobalMax ? {
                fill: "FFB6C1" // Светло-красный цвет
              } : undefined
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.avgTemp) })],
                alignment: AlignmentType.CENTER
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.meetsLimits || '-') })],
                alignment: AlignmentType.CENTER
              })]
            })
          ]
        })
      );
    });

    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });
  }

  /**
   * Получение информации о временном периоде испытания
   */
  private getTestPeriodInfo(markers: VerticalMarker[]) {
    if (markers.length < 2) return null;

    const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
    const startTime = new Date(sortedMarkers[0].timestamp);
    const endTime = new Date(sortedMarkers[sortedMarkers.length - 1].timestamp);
    const duration = endTime.getTime() - startTime.getTime();

    const formatDuration = (ms: number) => {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      if (hours > 0) {
        return `${hours}ч ${minutes}м ${seconds}с`;
      } else if (minutes > 0) {
        return `${minutes}м ${seconds}с`;
      } else {
        return `${seconds}с`;
      }
    };

    return {
      startTime: startTime.toLocaleString('ru-RU'),
      endTime: endTime.toLocaleString('ru-RU'),
      duration: formatDuration(duration)
    };
  }

  /**
   * Форматирование критериев приемки
   */
  private formatAcceptanceCriteria(limits: ChartLimits): string {
    const criteria: string[] = [];

    if (limits.temperature) {
      const tempCriteria: string[] = [];
      if (limits.temperature.min !== undefined) {
        tempCriteria.push(`мин. ${limits.temperature.min}°C`);
      }
      if (limits.temperature.max !== undefined) {
        tempCriteria.push(`макс. ${limits.temperature.max}°C`);
      }
      if (tempCriteria.length > 0) {
        criteria.push(`Температура: ${tempCriteria.join(', ')}`);
      }
    }

    if (limits.humidity) {
      const humCriteria: string[] = [];
      if (limits.humidity.min !== undefined) {
        humCriteria.push(`мин. ${limits.humidity.min}%`);
      }
      if (limits.humidity.max !== undefined) {
        humCriteria.push(`макс. ${limits.humidity.max}%`);
      }
      if (humCriteria.length > 0) {
        criteria.push(`Влажность: ${humCriteria.join(', ')}`);
      }
    }

    return criteria.length > 0 ? criteria.join('\n') : 'Критерии не установлены';
  }

  /**
   * Получение списка сгенерированных отчетов
   */
  getGeneratedReports(): string[] {
    return Array.from(this.generatedReports.keys());
  }

  /**
   * Получение списка сгенерированных графиков
   */
  getGeneratedCharts(): string[] {
    return Array.from(this.generatedCharts.keys());
  }

  /**
   * Удаление сгенерированного отчета
   */
  deleteReport(fileName: string): boolean {
    const reportDeleted = this.generatedReports.delete(fileName);
    // Также удаляем соответствующий график
    const chartFileName = fileName.replace('.docx', '_график.png');
    this.generatedCharts.delete(chartFileName);
    return reportDeleted;
  }

  /**
   * Проверка существования отчета
   */
  hasReport(fileName: string): boolean {
    return this.generatedReports.has(fileName);
  }

  /**
   * Проверка существования графика
   */
  hasChart(fileName: string): boolean {
    return this.generatedCharts.has(fileName);
  }

  /**
   * Получение отчета для повторного скачивания
   */
  downloadReport(fileName: string): boolean {
    const report = this.generatedReports.get(fileName);
    if (report) {
      saveAs(report, fileName);
      return true;
    }
    return false;
  }

  /**
   * Получение графика для повторного скачивания
   */
  downloadChart(fileName: string): boolean {
    const chart = this.generatedCharts.get(fileName);
    if (chart) {
      saveAs(chart, fileName);
      return true;
    }
    return false;
  }

  /**
   * Генерация примера шаблона отчета
   */
  async generateExampleTemplate(): Promise<boolean> {
    try {
      // Создаем базовый DOCX документ с примером шаблона
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ОТЧЕТ № {Report No.}",
                  bold: true,
                  size: 32
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
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "О РЕЗУЛЬТАТАХ ИСПЫТАНИЙ МИКРОКЛИМАТА",
                  bold: true,
                  size: 28
                })
              ],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "1. ОБЩИЕ СВЕДЕНИЯ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Объект исследования: ", bold: true }),
                new TextRun({ text: "{name of the object}" })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Климатическая установка: ", bold: true }),
                new TextRun({ text: "{name of the air conditioning system}" })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Вид испытания: ", bold: true }),
                new TextRun({ text: "{name of the test}" })
              ]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "2. КРИТЕРИИ ПРИЕМКИ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [new TextRun({ text: "{acceptance criteria}" })]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "3. ПЕРИОД ПРОВЕДЕНИЯ ИСПЫТАНИЙ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Начало испытания: ", bold: true }),
                new TextRun({ text: "{Date time of test start}" })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Завершение испытания: ", bold: true }),
                new TextRun({ text: "{Date time of test completion}" })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Длительность испытания: ", bold: true }),
                new TextRun({ text: "{Duration of the test}" })
              ]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "4. РЕЗУЛЬТАТЫ ИЗМЕРЕНИЙ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [new TextRun({ text: "{Results table}" })]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "5. ГРАФИЧЕСКОЕ ПРЕДСТАВЛЕНИЕ ДАННЫХ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [new TextRun({ text: "{chart}" })]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "6. ЗАКЛЮЧЕНИЕ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [new TextRun({ text: "{Result}" })]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [new TextRun({ text: "7. ИСПОЛНИТЕЛИ", bold: true })],
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Исполнитель: ", bold: true }),
                new TextRun({ text: "{executor}" })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Руководитель: ", bold: true }),
                new TextRun({ text: "{director}" })
              ]
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }),
            new Paragraph({
              children: [
                new TextRun({ text: "Дата составления отчета: ", bold: true }),
                new TextRun({ text: "{test date}" })
              ]
            })
          ]
        }]
      });

      // Генерируем и скачиваем файл
      const output = await Packer.toBlob(doc);
      saveAs(output, 'Пример_шаблона_отчета.docx');
      
      return true;
    } catch (error) {
      console.error('Ошибка создания примера шаблона:', error);
      return false;
    }
  }
}