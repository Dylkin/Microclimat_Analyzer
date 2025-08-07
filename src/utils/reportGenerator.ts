import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, HeadingLevel } from 'docx';
import html2canvas from 'html2canvas';

export interface ReportData {
  title: string;
  period: string;
  location: string;
  responsible: string;
  analysisResults: Array<{
    zoneNumber: string | number;
    measurementLevel: string;
    loggerName: string;
    serialNumber: string;
    minTemp: string | number;
    maxTemp: string | number;
    avgTemp: string | number;
    minHumidity?: string | number;
    maxHumidity?: string | number;
    avgHumidity?: string | number;
    meetsLimits: string;
  }>;
  chartImageBase64?: string;
}

export class ReportGenerator {
  /**
   * Генерация DOCX отчета с таблицей результатов и графиком
   */
  static async generateReport(data: ReportData): Promise<Blob> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Заголовок отчета
          new Paragraph({
            children: [
              new TextRun({
                text: data.title,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Информация об отчете
          new Paragraph({
            children: [
              new TextRun({
                text: `Период: ${data.period}`,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Место проведения: ${data.location}`,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Ответственный: ${data.responsible}`,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Заголовок таблицы
          new Paragraph({
            children: [
              new TextRun({
                text: "Результаты анализа",
                bold: true,
                size: 28,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),

          // Таблица результатов
          ReportGenerator.createAnalysisTable(data.analysisResults),

          // График (если есть)
          ...(data.chartImageBase64 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "График временных рядов",
                  bold: true,
                  size: 28,
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),

            new Paragraph({
              children: [
                new ImageRun({
                  data: ReportGenerator.base64ToArrayBuffer(data.chartImageBase64),
                  transformation: {
                    width: 800,  // Увеличиваем ширину для лучшего качества
                    height: 533, // Пропорциональная высота (800 * 2/3)
                  },
                  floating: {
                    horizontalPosition: {
                      align: AlignmentType.CENTER,
                    },
                    verticalPosition: {
                      align: AlignmentType.CENTER,
                    },
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
          ] : []),

          // Подпись
          new Paragraph({
            children: [
              new TextRun({
                text: `Отчет сгенерирован: ${new Date().toLocaleString('ru-RU')}`,
                italics: true,
                size: 20,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 600 },
          }),
        ],
      }],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Создание таблицы результатов анализа
   */
  private static createAnalysisTable(results: ReportData['analysisResults']): Table {
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "№ зоны", bold: true })] })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Уровень (м.)", bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Логгер", bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "S/N", bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Мин. t°C", bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Макс. t°C", bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Среднее t°C", bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ],
    });

    const dataRows = results.map(result => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.zoneNumber) })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.measurementLevel) })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.loggerName) })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.serialNumber) })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.minTemp) })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.maxTemp) })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.avgTemp) })] })],
        }),
      ],
    }));

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }

  /**
   * Захват графика как изображение с CSS поворотом на 90 градусов против часовой стрелки
   */
  static async captureChartAsImage(chartElement: HTMLElement): Promise<string> {
    try {
      // Применяем CSS поворот к элементу
      const originalTransform = chartElement.style.transform;
      chartElement.style.transform = 'rotate(-90deg)';
      chartElement.style.transformOrigin = 'center center';
      
      // Небольшая задержка для применения CSS
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Захватываем график с примененным CSS поворотом
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Увеличиваем разрешение
        useCORS: true,
        allowTaint: true,
        width: chartElement.offsetWidth,
        height: chartElement.offsetHeight,
        windowWidth: chartElement.offsetWidth,
        windowHeight: chartElement.offsetHeight
      });

      // Восстанавливаем исходный transform
      chartElement.style.transform = originalTransform;

      // Возвращаем base64 строку
      return canvas.toDataURL('image/png').split(',')[1];
    } catch (error) {
      console.error('Ошибка захвата графика:', error);
      // В случае ошибки также восстанавливаем transform
      if (chartElement) {
        chartElement.style.transform = '';
      }
      throw error;
    }
  }

  /**
   * Преобразование base64 в ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Сохранение файла
   */
  static saveFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}