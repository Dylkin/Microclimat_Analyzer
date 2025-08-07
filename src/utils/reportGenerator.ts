import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { createReport } from 'docx-templates';

export interface ReportData {
  title: string;
  period: string;
  location: string;
  responsible: string;
  analysisResults: any[];
  chartElement?: HTMLElement;
}

export class ReportGenerator {
  /**
   * Захват графика и поворот на 90 градусов против часовой стрелки
   */
  private async captureAndRotateChart(chartElement: HTMLElement): Promise<Uint8Array> {
    try {
      console.log('Захватываем график...');
      
      // Захватываем график с высоким качеством
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: chartElement.offsetWidth,
        height: chartElement.offsetHeight
      });

      console.log('Поворачиваем изображение на 90° против часовой стрелки...');
      
      // Создаем новый canvas для повернутого изображения
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d')!;
      
      // Устанавливаем размеры повернутого canvas (меняем местами ширину и высоту)
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
      
      // Перемещаем точку отсчета в центр canvas
      ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      
      // Поворачиваем на -90 градусов (против часовой стрелки)
      ctx.rotate(-Math.PI / 2);
      
      // Рисуем исходное изображение с учетом поворота
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      
      // Конвертируем повернутый canvas в blob
      const rotatedBlob = await new Promise<Blob>((resolve) => {
        rotatedCanvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });
      
      // Конвертируем blob в Uint8Array (браузерная альтернатива Buffer)
      const arrayBuffer = await rotatedBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('График успешно повернут');
      return uint8Array;

    } catch (error) {
      console.error('Ошибка при захвате и повороте графика:', error);
      throw new Error('Не удалось захватить и повернуть график');
    }
  }

  /**
   * Генерация отчета из шаблона DOCX
   */
  async generateReportFromTemplate(
    templateFile: File,
    reportData: ReportData
  ): Promise<void> {
    try {
      console.log('Начинаем генерацию отчета из шаблона...');

      // Читаем шаблон
      const templateBuffer = await templateFile.arrayBuffer();
      
      // Захватываем и поворачиваем график если он есть
      let chartImage: Uint8Array | undefined;
      if (reportData.chartElement) {
        chartImage = await this.captureAndRotateChart(reportData.chartElement);
      }

      // Подготавливаем данные для шаблона
      const templateData = {
        title: reportData.title,
        period: reportData.period,
        location: reportData.location,
        responsible: reportData.responsible,
        generatedDate: new Date().toLocaleDateString('ru-RU'),
        generatedTime: new Date().toLocaleTimeString('ru-RU'),
        analysisResults: reportData.analysisResults,
        // Добавляем график как изображение
        chart: chartImage ? {
          width: 15, // ширина в см
          height: 10, // высота в см
          data: chartImage,
          extension: '.png'
        } : null
      };

      console.log('Создаем документ из шаблона...');

      // Создаем документ из шаблона
      const report = await createReport({
        template: new Uint8Array(templateBuffer),
        data: templateData,
        additionalJsContext: {
          // Дополнительные функции для шаблона
          formatNumber: (num: number) => num.toFixed(1),
          formatDate: (date: string) => new Date(date).toLocaleDateString('ru-RU')
        },
        processLineBreaks: true
      });

      // Сохраняем файл
      const fileName = `Отчет_${reportData.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      
      const blob = new Blob([report], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      saveAs(blob, fileName);
      
      console.log('Отчет успешно сгенерирован:', fileName);

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      throw new Error(`Ошибка генерации отчета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создание простого отчета без шаблона (резервный вариант)
   */
  async generateSimpleReport(reportData: ReportData): Promise<void> {
    try {
      console.log('Генерируем простой отчет...');

      // Захватываем график если есть
      let chartImage: Uint8Array | undefined;
      if (reportData.chartElement) {
        chartImage = await this.captureAndRotateChart(reportData.chartElement);
      }

      // Создаем простой HTML отчет
      const htmlContent = this.generateHTMLReport(reportData, chartImage);
      
      // Сохраняем как HTML файл
      const fileName = `Отчет_${reportData.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      saveAs(blob, fileName);
      
      console.log('Простой отчет успешно сгенерирован:', fileName);

    } catch (error) {
      console.error('Ошибка генерации простого отчета:', error);
      throw new Error('Не удалось сгенерировать отчет');
    }
  }

  /**
   * Генерация HTML содержимого отчета
   */
  private generateHTMLReport(reportData: ReportData, chartImage?: Uint8Array): string {
    let chartImageSrc = '';
    if (chartImage) {
      // Преобразуем Uint8Array в base64 строку
      let binary = '';
      const len = chartImage.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(chartImage[i]);
      }
      chartImageSrc = `data:image/png;base64,${btoa(binary)}`;
    }

    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .info { margin-bottom: 20px; }
        .chart { text-align: center; margin: 30px 0; }
        .chart img { max-width: 100%; height: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${reportData.title}</h1>
        <p><strong>Период:</strong> ${reportData.period}</p>
        <p><strong>Место проведения:</strong> ${reportData.location}</p>
        <p><strong>Ответственный:</strong> ${reportData.responsible}</p>
        <p><strong>Дата генерации:</strong> ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}</p>
    </div>

    ${chartImage ? `
    <div class="chart">
        <h2>График временных рядов</h2>
        <img src="${chartImageSrc}" alt="График анализа" />
    </div>
    ` : ''}

    <h2>Результаты анализа</h2>
    <table>
        <thead>
            <tr>
                <th>№ зоны измерения</th>
                <th>Уровень измерения (м.)</th>
                <th>Наименование логгера</th>
                <th>Серийный № логгера</th>
                <th>Мин. t°C</th>
                <th>Макс. t°C</th>
                <th>Среднее t°C</th>
                <th>Соответствие лимитам</th>
            </tr>
        </thead>
        <tbody>
            ${reportData.analysisResults.map(result => `
                <tr>
                    <td>${result.zoneNumber}</td>
                    <td>${result.measurementLevel}</td>
                    <td>${result.loggerName}</td>
                    <td>${result.serialNumber}</td>
                    <td>${result.minTemp}</td>
                    <td>${result.maxTemp}</td>
                    <td>${result.avgTemp}</td>
                    <td>${result.meetsLimits}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }
}

// Экспортируем экземпляр генератора отчетов
export const reportGenerator = new ReportGenerator();