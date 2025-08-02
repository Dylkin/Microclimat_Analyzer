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
   * Генерация отчета с использованием docx.js
   */
  async generateReport(
    templateFile: File,
    reportData: ReportData,
    chartElement?: HTMLElement
  ): Promise<{ success: boolean; fileName: string; error?: string }> {
    try {
      console.log('Начинаем генерацию отчета с docx.js...');

      // Определяем имя файла для отчета
      let fileName: string;
      if (this.masterReport && this.masterReportName) {
        fileName = this.masterReportName;
      } else {
        fileName = `Отчет_${reportData.reportNumber}_${new Date().toISOString().split('T')[0]}.docx`;
        this.masterReportName = fileName;
      }

      // Определяем имя файла для графика
      const chartFileName = fileName.replace('.docx', '_график.png');

      // Получаем изображение графика если элемент предоставлен
      let chartImageBuffer: ArrayBuffer | null = null;
      
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
          
          // Создаем Buffer для PNG файла
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
          
        } catch (error) {
          console.warn('Ошибка конвертации графика:', error);
        }
      }

      // Создаем документ с помощью docx.js
      const doc = await this.createDocxDocument(reportData, chartImageBuffer);

      // Генерируем итоговый документ
      const output = await Packer.toBlob(doc);

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
   * Создание DOCX документа с помощью docx.js
   */
  private async createDocxDocument(reportData: ReportData, chartImageBuffer: ArrayBuffer | null): Promise<Document> {
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
            size: 28
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200
        }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `от ${reportData.reportDate ? new Date(reportData.reportDate).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU')}`,
            size: 22
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400
        }
      })
    );

    // Основная информация
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Объект исследования: ', bold: true }),
          new TextRun({ text: reportData.objectName || 'Не указано' })
        ],
        spacing: {
          after: 120
        }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Климатическая установка: ', bold: true }),
          new TextRun({ text: reportData.climateSystemName || 'Не указано' })
        ],
        spacing: {
          after: 120
        }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Вид испытания: ', bold: true }),
          new TextRun({ text: testTypes[reportData.testType as keyof typeof testTypes] || reportData.testType })
        ],
        spacing: {
          after: 300
        }
      })
    );

    // Критерии приемки
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Критерии приемки:', bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 200,
          after: 120
        }
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: acceptanceCriteria })],
        spacing: {
          after: 300
        }
      })
    );

    // Временные данные
    if (testPeriodInfo) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Период испытания:', bold: true })],
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 200,
            after: 120
          }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Начало: ', bold: true }),
            new TextRun({ text: testPeriodInfo.startTime })
          ],
          spacing: {
            after: 120
          }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Завершение: ', bold: true }),
            new TextRun({ text: testPeriodInfo.endTime })
          ],
          spacing: {
            after: 120
          }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Длительность: ', bold: true }),
            new TextRun({ text: testPeriodInfo.duration })
          ],
          spacing: {
            after: 300
          }
        })
      );
    }

    // Таблица результатов
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Результаты измерений:', bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 200,
          after: 120
        }
      })
    );

    // Создаем таблицу результатов
    const resultsTable = this.createResultsTable(reportData.resultsTableData);
    children.push(resultsTable);

    // График
    if (chartImageBuffer) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'График:', bold: true })],
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 300,
            after: 120
          }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: chartImageBuffer,
              transformation: {
                width: 550,
                height: 180
              }
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 300
          }
        })
      );
    }

    // Заключение
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Заключение:', bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 200,
          after: 120
        }
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: reportData.conclusion || 'Выводы не указаны' })],
        spacing: {
          after: 400
        }
      })
    );

    // Подписи

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Исполнитель: ', bold: true }),
          new TextRun({ text: reportData.user.fullName || 'Не указано' })
        ],
        spacing: {
          before: 200,
          after: 120
        }
      })
    );

    if (reportData.director) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Руководитель: ', bold: true }),
            new TextRun({ text: reportData.director })
          ],
          spacing: {
            after: 120
          }
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Дата: ', bold: true }),
          new TextRun({ text: new Date().toLocaleDateString('ru-RU') })
        ],
        spacing: {
          after: 120
        }
      })
    );

    return new Document({
      creator: "Microclimat Analyzer",
      title: `Отчет № ${reportData.reportNumber}`,
      description: "Отчет анализа микроклимата",
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: children
        }
      ]
    });
  }

  /**
   * Создание таблицы результатов
   */
  private createResultsTable(resultsTableData: any[]): Table {
    const rows = [];

    // Заголовок таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '№ зоны', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 10, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Уровень (м.)', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Логгер', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'S/N', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Мин. t°C', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Макс. t°C', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Среднее t°C', bold: true })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          })
        ],
        tableHeader: true
      })
    );

    // Данные таблицы
    resultsTableData.forEach(row => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.zoneNumber || '-') })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.measurementLevel || '-') })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.loggerName || '-') })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(row.serialNumber || '-') })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: typeof row.minTemp === 'number' ? `${row.minTemp}°C` : '-' })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : '-' })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : '-' })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: "center"
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
      },
      borders: {
        top: { style: "single", size: 1 },
        bottom: { style: "single", size: 1 },
        left: { style: "single", size: 1 },
        right: { style: "single", size: 1 },
        insideHorizontal: { style: "single", size: 1 },
        insideVertical: { style: "single", size: 1 }
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
}