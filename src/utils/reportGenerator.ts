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
          // Определяем область для захвата
          let captureOptions: any = {
            backgroundColor: '#ffffff',
            scale: 1,
            useCORS: true,
            allowTaint: true
          };

          // Если есть зум (выделенная область), захватываем только её
          if (reportData.markers && reportData.markers.length >= 2) {
            // Находим область графика внутри элемента
            const chartSvg = chartElement.querySelector('svg');
            if (chartSvg) {
              const svgRect = chartSvg.getBoundingClientRect();
              const containerRect = chartElement.getBoundingClientRect();
              
              // Вычисляем относительные координаты SVG внутри контейнера
              const svgLeft = svgRect.left - containerRect.left;
              const svgTop = svgRect.top - containerRect.top;
              
              captureOptions = {
                ...captureOptions,
                x: svgLeft,
                y: svgTop,
                width: svgRect.width,
                height: svgRect.height
              };
            }
          }

          const canvas = await html2canvas(chartElement, captureOptions);
          
          console.log('График успешно конвертирован в canvas');
          console.log('Размер исходного canvas:', canvas.width, 'x', canvas.height);
          
          // Создаем новый canvas для поворота изображения на 90 градусов против часовой стрелки
          const rotatedCanvas = document.createElement('canvas');
          const rotatedCtx = rotatedCanvas.getContext('2d');
          
          if (rotatedCtx) {
            // Устанавливаем размеры повернутого canvas (меняем местами ширину и высоту без изменения пропорций)
            rotatedCanvas.width = canvas.height; // Высота становится шириной
            rotatedCanvas.height = canvas.width;  // Ширина становится высотой
            
            console.log('Размер повернутого canvas:', rotatedCanvas.width, 'x', rotatedCanvas.height);
            
            // Перемещаем точку отсчета в центр canvas
            rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
            
            // Поворачиваем на -90 градусов (против часовой стрелки)
            rotatedCtx.rotate(-Math.PI / 2);
            
            // Рисуем исходное изображение с центрированием (без масштабирования)
            rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            
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
            // Fallback: используем исходный canvas
            const canvas = await html2canvas(chartElement, captureOptions);
            const chartBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => {
                resolve(blob);
              }, 'image/png');
            });
            
            if (chartBlob) {
              chartImageBuffer = await chartBlob.arrayBuffer();
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

    // Создаем таблицу результатов
    const resultsTable = this.createResultsTable(reportData.resultsTableData);
    children.push(resultsTable);

    // График
    if (chartImageBuffer) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'График:', bold: true })],
          heading: HeadingLevel.HEADING_2
        })
      );

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: chartImageBuffer,
              transformation: {
                width: Math.min(500, rotatedCanvas?.width || 400),
                height: Math.min(700, rotatedCanvas?.height || 600)
              }
            })
          ],
          alignment: AlignmentType.CENTER
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

    return new Document({
      sections: [
        {
          properties: {},
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
            children: [new Paragraph({ children: [new TextRun({ text: '№ зоны', bold: true })] })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Уровень (м.)', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Логгер', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'S/N', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Мин. t°C', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Макс. t°C', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Среднее t°C', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );

    // Данные таблицы
    resultsTableData.forEach(row => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.zoneNumber || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.measurementLevel || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.loggerName || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row.serialNumber || '-') })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: typeof row.minTemp === 'number' ? `${row.minTemp}°C` : '-' })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : '-' })] })]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : '-' })] })]
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
}