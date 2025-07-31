import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { saveAs } from 'file-saver';
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
   * Генерация отчета на основе шаблона DOCX
   */
  async generateReport(
    templateFile: File,
    reportData: ReportData,
    chartElement?: HTMLElement
  ): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      console.log('Начинаем генерацию отчета...');
      console.log('Размер файла шаблона:', templateFile.size, 'байт');
      console.log('Тип файла:', templateFile.type);
      console.log('Имя файла:', templateFile.name);

      // Проверяем, что файл действительно DOCX
      if (!templateFile.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Файл должен иметь расширение .docx');
      }

      if (templateFile.size === 0) {
        throw new Error('Файл шаблона пустой');
      }

      // Получаем изображение графика если элемент предоставлен
      let chartImageData = '';
      let chartBlob: Blob | null = null;
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
          console.log('График успешно конвертирован в изображение');
          
          // Создаем Blob для PNG файла
          canvas.toBlob((blob) => {
            if (blob) {
              chartBlob = blob;
            }
          }, 'image/png');
          
        } catch (error) {
          console.warn('Ошибка конвертации графика:', error);
        }
      }

      let templateBuffer: ArrayBuffer;
      
      // Если есть мастер-отчет, используем его как основу
      if (this.masterReport) {
        console.log('Используем существующий мастер-отчет как основу');
        templateBuffer = await this.masterReport.arrayBuffer();
      } else {
        console.log('Используем новый шаблон');
        templateBuffer = await templateFile.arrayBuffer();
      }
      
      let zip: PizZip;
      try {
        zip = new PizZip(templateBuffer);
      } catch (zipError) {
        console.error('Ошибка при обработке DOCX файла:', zipError);
        throw new Error('Загруженный файл не является корректным DOCX документом или поврежден. Пожалуйста, загрузите правильный файл шаблона в формате .docx');
      }
      
      // Создаем модуль для обработки изображений с правильной библиотекой
      const imageModule = new ImageModule({
        getImage: function(tagValue: string, tagName: string) {
          console.log('getImage called with tagValue:', tagValue, 'tagName:', tagName);
          
          // Проверяем, что это плейсхолдер chart и у нас есть данные изображения
          if (tagName === 'chart' && chartImageData) {
            // Если tagValue содержит data URL, извлекаем base64 часть
            let base64Data;
            if (tagValue && tagValue.startsWith('data:image/png;base64,')) {
              base64Data = tagValue.split(',')[1];
            } else if (chartImageData.startsWith('data:image/png;base64,')) {
              base64Data = chartImageData.split(',')[1];
            } else {
              console.warn('Неожиданный формат данных изображения');
              return null;
            }
            
            console.log('Обрабатываем base64 данные изображения, длина:', base64Data.length);
            return Buffer.from(base64Data, 'base64'); // Используем Buffer напрямую
          }
          
          return null;
        },
        getSize: function() {
          return [1200, 400]; // Размер изображения в пикселях
        }
      });
      
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true,
        nullGetter: (part) => {
          console.warn(`Плейсхолдер не найден: ${part.module}:${part.value}`);
          return '';
        }
      });

      // Подготавливаем данные для замены плейсхолдеров
      const templateData = this.prepareTemplateData(reportData, chartImageData);
      
      console.log('Данные для шаблона:', templateData);

      // Заполняем шаблон данными
      doc.setData(templateData);


      try {
        doc.render();
      } catch (renderError: any) {
        console.error('Ошибка рендеринга шаблона:', renderError);
        
        // Обработка специфических ошибок docxtemplater
        if (renderError.name === 'TemplateError') {
          const errors = renderError.properties?.errors || [];
          const errorMessages = errors.map((err: any) => 
            `Строка ${err.line}: ${err.message}`
          ).join('\n');
          throw new Error(`Ошибки в шаблоне:\n${errorMessages}`);
        }
        
        if (renderError.properties && renderError.properties.errors) {
          const errors = renderError.properties.errors;
          const errorDetails = errors.map((err: any) => {
            return `Ошибка в позиции ${err.offset}: ${err.message}`;
          }).join('\n');
          throw new Error(`Ошибки обработки шаблона:\n${errorDetails}`);
        }
        
        throw new Error(`Ошибка обработки шаблона: ${renderError.message || renderError}`);
      }

      // Получаем обработанный документ
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Определяем имя файла
      let fileName: string;
      if (this.masterReport && this.masterReportName) {
        // Используем существующее имя файла
        fileName = this.masterReportName;
      } else {
        // Создаем новое имя файла
        fileName = `Отчет_${reportData.reportNumber}_${new Date().toISOString().split('T')[0]}.docx`;
        this.masterReportName = fileName;
      }
      
      // Сохраняем как мастер-отчет для последующих добавлений
      this.masterReport = output;
      this.generatedReports.set(fileName, output);
      
      // Сохраняем график если он был создан
      if (chartBlob) {
        const chartFileName = fileName.replace('.docx', '_график.png');
        this.generatedCharts.set(chartFileName, chartBlob);
      }

      // Скачиваем файл
      saveAs(output, fileName);

      console.log('Отчет успешно сгенерирован:', fileName);

      return {
        success: true,
        fileName
      };

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      
      // Специальная обработка для ошибок ZIP
      if (error instanceof Error && error.message.includes('central directory')) {
        return {
          success: false,
          fileName: '',
          error: 'Загруженный файл не является корректным DOCX документом. Пожалуйста, загрузите правильный файл шаблона в формате .docx'
        };
      }
      
      return {
        success: false,
        fileName: '',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Создание модуля для вставки изображений
   */
  private createImageModule(currentImageId: number) {
    return {
      name: 'ImageModule',
      parse: (tag: any) => {
        if (tag.value === 'chart') {
          return {
            type: 'placeholder',
            value: tag.value,
            module: 'ImageModule'
          };
        }
        return null;
      },
      render: (part: any, options: any) => {
        if (part.module === 'ImageModule' && part.value === 'chart') {
          const chartImageData = options.scopeManager.getValue('chart');
          if (chartImageData && chartImageData.startsWith('data:image/png;base64,')) {
            // Вместо сложной вставки изображения, используем простой текст-заглушку
            return { value: '[ГРАФИК БУДЕТ ВСТАВЛЕН ЗДЕСЬ]' };
          }
        }
        return { value: '[ГРАФИК НЕ ДОСТУПЕН]' };
      }
    };
  }

  /**
   * Подготовка данных для замены плейсхолдеров в шаблоне
   */
  private prepareTemplateData(reportData: ReportData, chartImageData: string) {
    // Получаем информацию о временном периоде
    const testPeriodInfo = this.getTestPeriodInfo(reportData.markers);
    
    // Формируем критерии приемки
    const acceptanceCriteria = this.formatAcceptanceCriteria(reportData.limits);
    
    // Формируем таблицу результатов
    const resultsTable = this.formatResultsTable(reportData.resultsTableData);

    // Получаем тип испытания
    const testTypes = {
      'empty-object': 'Соответствие критериям в пустом объекте',
      'loaded-object': 'Соответствие критериям в загруженном объекте',
      'door-opening': 'Открытие двери',
      'power-off': 'Отключение электропитания',
      'power-on': 'Включение электропитания'
    };

    return {
      'name of the test': testTypes[reportData.testType as keyof typeof testTypes] || reportData.testType,
      'name of the object': reportData.objectName || 'Не указано',
      'name of the air conditioning system': reportData.climateSystemName || 'Не указано',
      'acceptance criteria': acceptanceCriteria,
      'Date time of test start': testPeriodInfo?.startTime || 'Не определено',
      'Date time of test completion': testPeriodInfo?.endTime || 'Не определено',
      'Duration of the test': testPeriodInfo?.duration || 'Не определено',
      'Results table': resultsTable,
      'Result': reportData.conclusion || 'Выводы не указаны',
      'executor': reportData.user.fullName || 'Не указано',
      'test date': new Date().toLocaleDateString('ru-RU'),
      'Report No.': reportData.reportNumber || 'Не указан',
      'Report date': reportData.reportDate ? new Date(reportData.reportDate).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
      'director': reportData.director || 'Не назначен',
      'chart': chartImageData || ''
    };
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
   * Форматирование таблицы результатов
   */
  private formatResultsTable(resultsTableData: any[]): string {
    if (!resultsTableData || resultsTableData.length === 0) {
      return 'Данные отсутствуют';
    }

    const headers = [
      '№ зоны',
      'Уровень (м.)',
      'Логгер',
      'S/N',
      'Мин. t°C',
      'Макс. t°C',
      'Среднее t°C',
      'Соответствие'
    ];

    let table = headers.join('\t') + '\n';
    table += headers.map(() => '---').join('\t') + '\n';

    resultsTableData.forEach(row => {
      const tableRow = [
        row.zoneNumber || '-',
        row.measurementLevel || '-',
        row.loggerName || '-',
        row.serialNumber || '-',
        typeof row.minTemp === 'number' ? `${row.minTemp}°C` : '-',
        typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : '-',
        typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : '-',
        row.meetsLimits || '-'
      ];
      table += tableRow.join('\t') + '\n';
    });

    return table;
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
}