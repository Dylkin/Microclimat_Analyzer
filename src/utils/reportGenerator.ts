import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
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
  chartImageData?: string;
}

export class ReportGenerator {
  private static instance: ReportGenerator;
  private generatedReports: Map<string, Blob> = new Map();

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

      // Получаем изображение графика если элемент предоставлен
      let chartImageData = '';
      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true
          });
          chartImageData = canvas.toDataURL('image/png');
          console.log('График успешно конвертирован в изображение');
        } catch (error) {
          console.warn('Ошибка конвертации графика:', error);
        }
      }

      // Читаем шаблон DOCX
      const templateBuffer = await templateFile.arrayBuffer();
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Подготавливаем данные для замены плейсхолдеров
      const templateData = this.prepareTemplateData(reportData, chartImageData);
      
      console.log('Данные для шаблона:', templateData);

      // Заполняем шаблон данными
      doc.setData(templateData);

      try {
        doc.render();
      } catch (error) {
        console.error('Ошибка рендеринга шаблона:', error);
        throw new Error('Ошибка обработки шаблона. Проверьте корректность плейсхолдеров.');
      }

      // Получаем обработанный документ
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Конвертируем в PDF (упрощенная версия - сохраняем как DOCX)
      const fileName = `Отчет_${reportData.reportNumber}_${new Date().toISOString().split('T')[0]}.docx`;
      
      // Сохраняем сгенерированный отчет
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
      'chart': chartImageData ? '[ГРАФИК ВКЛЮЧЕН]' : '[ГРАФИК НЕ ДОСТУПЕН]'
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
   * Удаление сгенерированного отчета
   */
  deleteReport(fileName: string): boolean {
    return this.generatedReports.delete(fileName);
  }

  /**
   * Проверка существования отчета
   */
  hasReport(fileName: string): boolean {
    return this.generatedReports.has(fileName);
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
}