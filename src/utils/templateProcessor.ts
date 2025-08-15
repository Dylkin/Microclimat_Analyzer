import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';

export interface TemplateData {
  DATE: string;
  DATA_TYPE: string;
  CHART: ArrayBuffer;
  TABLE: any[];
}

/**
 * Процессор шаблонов DOCX
 * Заменяет плейсхолдеры в шаблоне на актуальные данные
 */
export class TemplateProcessor {
  
  /**
   * Обработка шаблона DOCX с заменой плейсхолдеров
   */
  static async processTemplate(templateBuffer: ArrayBuffer, data: TemplateData): Promise<ArrayBuffer> {
    try {
      // Создаем новый документ с данными из шаблона
      const doc = new Document({
        sections: [
          {
            children: [
              // Заголовок
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Отчет по анализу временных рядов - ${data.DATA_TYPE}`,
                    bold: true,
                    size: 32,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // Дата
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Дата создания отчета: ${data.DATE}`,
                    size: 24,
                  }),
                ],
                spacing: { after: 400 },
              }),

              // График
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'График временных рядов',
                    bold: true,
                    size: 28,
                  }),
                ],
                spacing: { after: 200 },
              }),

              new Paragraph({
                children: [
                  new ImageRun({
                    data: data.CHART,
                    transformation: {
                      width: 560,
                      height: 840,
                    },
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // Таблица результатов
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Результаты анализа',
                    bold: true,
                    size: 28,
                  }),
                ],
                spacing: { after: 200 },
              }),

              // Создаем таблицу
              this.createResultsTable(data.TABLE),

              // Примечания
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Примечания:',
                    bold: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 400, after: 200 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: '• График повернут на 90° против часовой стрелки для оптимального размещения',
                    size: 22,
                  }),
                ],
                spacing: { after: 100 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: '• Синим цветом выделены минимальные значения в периоде',
                    size: 22,
                  }),
                ],
                spacing: { after: 100 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: '• Красным цветом выделены максимальные значения в периоде',
                    size: 22,
                  }),
                ],
                spacing: { after: 100 },
              }),
            ],
          },
        ],
      });

      return await Packer.toBuffer(doc);
      
    } catch (error) {
      console.error('Ошибка обработки шаблона:', error);
      throw new Error('Не удалось обработать шаблон');
    }
  }

  /**
   * Создание таблицы результатов
   */
  private static createResultsTable(results: any[]): Table {
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '№ зоны', bold: true, size: 20 })] })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Уровень (м.)', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Логгер', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'S/N', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Мин. t°C', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Макс. t°C', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Среднее t°C', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ],
    });

    const dataRows = results.map(result => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.zoneNumber), size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.measurementLevel), size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.loggerName), size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.serialNumber), size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.minTemp), size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.maxTemp), size: 18 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(result.avgTemp), size: 18 })] })],
        }),
      ],
    }));

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }
}