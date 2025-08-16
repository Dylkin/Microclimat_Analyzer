import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel } from 'docx';
import html2canvas from 'html2canvas';

export interface TemplateReportData {
  title: string;
  date: string;
  dataType: 'temperature' | 'humidity';
  analysisResults: any[];
}

export class DocxTemplateProcessor {
  private static instance: DocxTemplateProcessor;

  static getInstance(): DocxTemplateProcessor {
    if (!DocxTemplateProcessor.instance) {
      DocxTemplateProcessor.instance = new DocxTemplateProcessor();
    }
    return DocxTemplateProcessor.instance;
  }

  /**
   * Создание скриншота HTML элемента с поворотом на 90°
   */
  private async createRotatedScreenshot(element: HTMLElement): Promise<ArrayBuffer> {
    // Временно скрываем все кнопки в области графика
    const buttons = element.querySelectorAll('button');
    const originalDisplays: string[] = [];
    buttons.forEach((button, index) => {
      originalDisplays[index] = button.style.display;
      button.style.display = 'none';
    });

    try {
      // Получаем реальные размеры элемента
      const elementRect = element.getBoundingClientRect();
      const originalWidth = elementRect.width;
      const originalHeight = elementRect.height;
      
      console.log('Оригинальные размеры элемента:', { width: originalWidth, height: originalHeight });

      // Создаем скриншот с высоким качеством
      const canvas = await html2canvas(element, {
        scale: 2, // Высокое разрешение
        backgroundColor: '#ffffff', // Белый фон
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: originalWidth,
        height: originalHeight,
        onclone: (clonedDoc) => {
          // Убеждаемся, что в клонированном документе тоже скрыты кнопки
          const clonedButtons = clonedDoc.querySelectorAll('button');
          clonedButtons.forEach(button => {
            button.style.display = 'none';
          });
        }
      });

      // Создаем новый canvas для поворота изображения на 90° против часовой стрелки
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Ошибка создания контекста для поворота изображения');
      }

      // Устанавливаем размеры повернутого canvas
      // После поворота на 90° ширина и высота меняются местами
      const rotatedWidth = canvas.height;
      const rotatedHeight = canvas.width;
      
      rotatedCanvas.width = rotatedWidth;
      rotatedCanvas.height = rotatedHeight;
      
      console.log('Размеры после поворота:', { width: rotatedWidth, height: rotatedHeight });

      // Поворачиваем контекст на 90° против часовой стрелки
      ctx.translate(0, rotatedHeight);
      ctx.rotate(-Math.PI / 2);

      // Рисуем исходное изображение на повернутом canvas
      ctx.drawImage(canvas, 0, 0);

      // Конвертируем в ArrayBuffer
      return new Promise<ArrayBuffer>((resolve, reject) => {
        rotatedCanvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(reject);
          } else {
            reject(new Error('Ошибка создания изображения графика'));
          }
        }, 'image/png', 1.0);
      });

    } finally {
      // Восстанавливаем отображение кнопок
      buttons.forEach((button, index) => {
        button.style.display = originalDisplays[index] || '';
      });
    }
  }

  /**
   * Создание отчета на основе шаблона с PNG изображением
   */
  async processTemplate(
    templateFile: File,
    data: TemplateReportData,
    chartElement: HTMLElement
  ): Promise<Blob> {
    try {
      console.log('Создание отчета по шаблону с PNG изображением...');
      
      // Создаем скриншот графика
      console.log('Создаем скриншот графика...');
      const chartImageBuffer = await this.createRotatedScreenshot(chartElement);
      console.log('Скриншот создан, размер:', chartImageBuffer.byteLength, 'байт');

      // Создаем DOCX документ с изображением (аналогично DocxImageGenerator)
      const doc = new Document({
        sections: [
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

              // Вставка изображения графика
              new Paragraph({
                children: [
                  new ImageRun({
                    data: chartImageBuffer,
                    transformation: {
                      width: Math.min(600, chartElement.getBoundingClientRect().height * 0.8),
                      height: Math.min(800, chartElement.getBoundingClientRect().width * 0.8),
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
        ],
      });

      // Генерируем DOCX файл
      console.log('Генерируем DOCX файл...');
      const buffer = await Packer.toBlob(doc);
      console.log('DOCX файл создан успешно, размер:', buffer.size, 'байт');
      
      return buffer;

    } catch (error) {
      console.error('Ошибка генерации отчета по шаблону:', error);
      throw new Error(`Не удалось создать отчет по шаблону: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создание сводки результатов анализа
   */
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

  /**
   * Упрощенная валидация DOCX шаблона
   */
  async validateTemplate(templateFile: File): Promise<{ isValid: boolean; errors: string[] }> {
    // Упрощенная валидация - проверяем только расширение файла
    if (!templateFile.name.toLowerCase().endsWith('.docx')) {
      return {
        isValid: false,
        errors: ['Файл должен иметь расширение .docx']
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }
}