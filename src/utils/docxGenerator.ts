import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { TemplateProcessor, TemplateData } from './templateProcessor';

export interface ReportData {
  title: string;
  date: string;
  dataType: 'temperature' | 'humidity';
  chartImageBlob: Blob;
  analysisResults: any[];
}

export class DocxReportGenerator {
  private static instance: DocxReportGenerator;
  private currentDoc: Document | null = null;
  private sections: any[] = [];

  static getInstance(): DocxReportGenerator {
    if (!DocxReportGenerator.instance) {
      DocxReportGenerator.instance = new DocxReportGenerator();
    }
    return DocxReportGenerator.instance;
  }

  async generateReport(data: ReportData): Promise<Blob> {
    try {
      // Если документ уже существует, добавляем в него новую секцию
      if (this.currentDoc) {
        await this.addSectionToExistingDoc(data);
      } else {
        // Создаем новый документ
        await this.createNewDocument(data);
      }

      // Генерируем DOCX файл
      const buffer = await Packer.toBlob(this.currentDoc!);
      return buffer;
    } catch (error) {
      console.error('Ошибка генерации DOCX отчета:', error);
      throw new Error('Не удалось создать отчет');
    }
  }

  async generateReportFromTemplate(data: ReportData, templateFile: File): Promise<Blob> {
    try {
      console.log('Генерация отчета на основе шаблона:', templateFile.name);
      
      // Читаем шаблон как ArrayBuffer
      const templateBuffer = await templateFile.arrayBuffer();
      
      // Конвертируем изображение графика в ArrayBuffer
      const imageBuffer = await data.chartImageBlob.arrayBuffer();
      
      // Подготавливаем данные для шаблона
      const templateData: TemplateData = {
        DATE: data.date,
        DATA_TYPE: data.dataType === 'temperature' ? 'Температура' : 'Влажность',
        CHART: imageBuffer,
        TABLE: data.analysisResults
      };
      
      // Обрабатываем шаблон
      const processedBuffer = await TemplateProcessor.processTemplate(templateBuffer, templateData);
      
      // Возвращаем как Blob
      return new Blob([processedBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error('Не удалось создать отчет из шаблона: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  }

  private async createNewDocument(data: ReportData): Promise<void> {
    // Конвертируем изображение в ArrayBuffer
    const imageBuffer = await data.chartImageBlob.arrayBuffer();

    this.sections = [
      {
        children: [
          // Заголовок отчета
          new Paragraph({
            children: [
              new TextRun({
                text: data.title,
                bold: true,
                size: 32, // 16pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),

          // Дата создания
          new Paragraph({
            children: [
              new TextRun({
                text: `Дата создания отчета: ${data.date}`,
                size: 24, // 12pt
              }),
            ],
            spacing: { after: 200 },
          }),

          // Тип данных
          new Paragraph({
            children: [
              new TextRun({
                text: `Тип анализируемых данных: ${data.dataType === 'temperature' ? 'Температура' : 'Влажность'}`,
                size: 24, // 12pt
              }),
            ],
            spacing: { after: 400 },
          }),

          // Заголовок графика
          new Paragraph({
            children: [
              new TextRun({
                text: 'График временных рядов',
                bold: true,
                size: 28, // 14pt
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),

          // График (повернутый на 90°)
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: 560, // Увеличено на 40%
                  height: 840, // Увеличено на 40%
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Примечание о повороте
          new Paragraph({
            children: [
              new TextRun({
                text: 'Примечание: График повернут на 90° против часовой стрелки для оптимального размещения в отчете.',
                italics: true,
                size: 20, // 10pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Заголовок таблицы результатов
          new Paragraph({
            children: [
              new TextRun({
                text: 'Результаты анализа',
                bold: true,
                size: 28, // 14pt
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),

          // Описание результатов
          new Paragraph({
            children: [
              new TextRun({
                text: 'Статистические данные по измерениям:',
                size: 24, // 12pt
              }),
            ],
            spacing: { after: 200 },
          }),

          // Сводка по результатам
          ...this.createResultsSummary(data.analysisResults, data.dataType),
        ],
      },
    ];

    this.currentDoc = new Document({
      sections: this.sections,
    });
  }

  private async addSectionToExistingDoc(data: ReportData): Promise<void> {
    // Конвертируем изображение в ArrayBuffer
    const imageBuffer = await data.chartImageBlob.arrayBuffer();

    // Добавляем разрыв страницы и новую секцию
    const newSection = {
      children: [
        // Разделитель
        new Paragraph({
          children: [
            new TextRun({
              text: '─'.repeat(50),
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
        }),

        // Заголовок новой секции
        new Paragraph({
          children: [
            new TextRun({
              text: `Дополнительный анализ - ${data.dataType === 'temperature' ? 'Температура' : 'Влажность'}`,
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        }),

        // Дата добавления
        new Paragraph({
          children: [
            new TextRun({
              text: `Добавлено: ${data.date}`,
              size: 24,
            }),
          ],
          spacing: { after: 400 },
        }),

        // График
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 400,
                height: 600,
              },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // Результаты
        new Paragraph({
          children: [
            new TextRun({
              text: 'Результаты дополнительного анализа:',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        ...this.createResultsSummary(data.analysisResults, data.dataType),
      ],
    };

    // Добавляем новую секцию к существующим
    this.sections[0].children.push(...newSection.children);

    // Пересоздаем документ с обновленными секциями
    this.currentDoc = new Document({
      sections: this.sections,
    });
  }

  private createResultsSummary(results: any[], dataType: 'temperature' | 'humidity'): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Подсчитываем общую статистику
    const validResults = results.filter(r => !r.isExternal && r.minTemp !== '-');
    const totalFiles = validResults.length;
    const externalSensors = results.filter(r => r.isExternal).length;

    // Общая информация
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Общее количество датчиков: ${results.length}`,
            size: 24,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Внутренние датчики: ${totalFiles}`,
            size: 24,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Внешние датчики: ${externalSensors}`,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    if (dataType === 'temperature' && validResults.length > 0) {
      // Температурная статистика
      const temperatures = validResults.map(r => parseFloat(r.avgTemp)).filter(t => !isNaN(t));
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);
      const avgTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Температурная статистика:',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `• Минимальная средняя температура: ${minTemp.toFixed(1)}°C`,
              size: 22,
            }),
          ],
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `• Максимальная средняя температура: ${maxTemp.toFixed(1)}°C`,
              size: 22,
            }),
          ],
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `• Общая средняя температура: ${avgTemp.toFixed(1)}°C`,
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Соответствие лимитам
    const compliantCount = results.filter(r => r.meetsLimits === 'Да').length;
    const nonCompliantCount = results.filter(r => r.meetsLimits === 'Нет').length;

    if (compliantCount > 0 || nonCompliantCount > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Соответствие установленным лимитам:',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `• Соответствуют лимитам: ${compliantCount} датчиков`,
              size: 22,
            }),
          ],
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `• Не соответствуют лимитам: ${nonCompliantCount} датчиков`,
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    return paragraphs;
  }

  async saveReport(filename: string): Promise<void> {
    if (!this.currentDoc) {
      throw new Error('Нет документа для сохранения');
    }

    const buffer = await Packer.toBlob(this.currentDoc);
    saveAs(buffer, filename);
  }

  hasExistingDocument(): boolean {
    return this.currentDoc !== null;
  }

  clearDocument(): void {
    this.currentDoc = null;
    this.sections = [];
  }
}