import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { createReport } from 'docx-templates';
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
   * Генерация отчета на основе шаблона DOCX с использованием docx-templates
   */
  async generateReport(
    templateFile: File,
    reportData: ReportData,
    chartElement?: HTMLElement
  ): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      console.log('Начинаем генерацию отчета с docx-templates...');
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
      let chartImageBuffer: Buffer | null = null;
      let chartFileName = '';
      
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
          
          console.log('График успешно конвертирован в canvas');
          
          // Определяем имя файла для графика
          if (this.masterReport && this.masterReportName) {
            chartFileName = this.masterReportName.replace('.docx', '_график.png');
          } else {
            chartFileName = `Отчет_${reportData.reportNumber}_${new Date().toISOString().split('T')[0]}_график.png`;
          }
          
          // Создаем Buffer для PNG файла
          const chartBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob);
            }, 'image/png');
          });
          
          if (chartBlob) {
            const arrayBuffer = await chartBlob.arrayBuffer();
            chartImageBuffer = Buffer.from(arrayBuffer);
            
            // Сохраняем график для отдельного скачивания
            this.generatedCharts.set(chartFileName, chartBlob);
            console.log('График сохранен как:', chartFileName);
          }
          
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

      // Подготавливаем данные для замены плейсхолдеров
      const templateData = this.prepareTemplateData(reportData, chartImageBuffer);
      
      console.log('Данные для шаблона подготовлены');

      // Генерируем отчет с помощью docx-templates
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        additionalJsContext: {
          // Дополнительные функции для обработки данных
          formatDate: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
          formatNumber: (num: number) => num.toFixed(1)
        },
        cmdDelimiter: ['{', '}'], // Используем стандартные разделители
        literalXmlDelimiter: '||', // Для вставки сырого XML
        processLineBreaks: true,
        noSandBox: false
      });

      console.log('Отчет успешно сгенерирован с docx-templates');

      // Создаем Blob из буфера
      const output = new Blob([reportBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Определяем имя файла
      let fileName: string;
      if (this.masterReport && this.masterReportName) {
        fileName = this.masterReportName;
      } else {
        fileName = `Отчет_${reportData.reportNumber}_${new Date().toISOString().split('T')[0]}.docx`;
        this.masterReportName = fileName;
      }
      
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
   * Подготовка данных для замены плейсхолдеров в шаблоне
   */
  private prepareTemplateData(reportData: ReportData, chartImageBuffer: Buffer | null) {
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
      // Основная информация
      nameOfTheTest: testTypes[reportData.testType as keyof typeof testTypes] || reportData.testType,
      nameOfTheObject: reportData.objectName || 'Не указано',
      nameOfTheAirConditioningSystem: reportData.climateSystemName || 'Не указано',
      acceptanceCriteria: acceptanceCriteria,
      
      // Временные данные
      dateTimeOfTestStart: testPeriodInfo?.startTime || 'Не определено',
      dateTimeOfTestCompletion: testPeriodInfo?.endTime || 'Не определено',
      durationOfTheTest: testPeriodInfo?.duration || 'Не определено',
      
      // Результаты
      resultsTable: resultsTable,
      result: reportData.conclusion || 'Выводы не указаны',
      
      // Исполнители и даты
      executor: reportData.user.fullName || 'Не указано',
      testDate: new Date().toLocaleDateString('ru-RU'),
      reportNo: reportData.reportNumber || 'Не указан',
      reportDate: reportData.reportDate ? new Date(reportData.reportDate).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
      director: reportData.director || 'Не назначен',
      
      // График как изображение
      chart: chartImageBuffer ? {
        width: 15, // ширина в см
        height: 10, // высота в см
        data: chartImageBuffer,
        extension: '.png'
      } : null
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