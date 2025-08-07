import { createReport } from 'docx-templates';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { ReportData, AnalysisResult } from '../types/ReportTypes';

export class ReportGenerator {
  /**
   * Генерация DOCX отчета
   */
  async generateReport(
    templateFile: File,
    reportData: ReportData,
    analysisResults: AnalysisResult[],
    chartElement: HTMLCanvasElement | null
  ): Promise<void> {
    try {
      console.log('Начинаем генерацию отчета...');

      // 1. Читаем шаблон
      const templateBuffer = await this.readFileAsArrayBuffer(templateFile);
      console.log('Шаблон загружен, размер:', templateBuffer.byteLength, 'байт');

      // 2. Захватываем график
      let chartImage: string | null = null;
      if (chartElement) {
        chartImage = await this.captureChart(chartElement);
        console.log('График захвачен');
      }

      // 3. Создаем таблицу результатов
      const resultsTable = this.createResultsTable(analysisResults);
      console.log('Таблица результатов создана');

      // 4. Подготавливаем данные для замены
      const templateData = {
        ...this.formatReportData(reportData),
        'Results table': resultsTable,
        chart: chartImage ? {
          width: 15, // см
          height: 10, // см
          data: chartImage,
          extension: '.png',
        } : null,
      };

      console.log('Данные для шаблона подготовлены');

      // 5. Генерируем отчет
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        cmdDelimiter: ['{', '}'],
        literalXmlDelimiter: ['{{', '}}'],
        processLineBreaks: true,
        noSandBox: true,
        runJs: false, // Отключаем выполнение JavaScript
      });

      console.log('Отчет сгенерирован, размер:', reportBuffer.byteLength, 'байт');

      // 6. Сохраняем файл
      const fileName = `Отчет_${reportData.reportNo}_${new Date().toISOString().split('T')[0]}.docx`;
      const blob = new Blob([reportBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      saveAs(blob, fileName);
      console.log('Файл сохранен:', fileName);

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      throw new Error(`Не удалось сгенерировать отчет: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Чтение файла как ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Ошибка чтения файла шаблона'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Захват графика
   */
  private async captureChart(chartElement: HTMLCanvasElement): Promise<string> {
    try {
      // Захватываем изображение графика
      const dataUrl = await toPng(chartElement, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      // Возвращаем base64 данные без префикса
      return dataUrl.split(',')[1];

    } catch (error) {
      console.error('Ошибка захвата графика:', error);
      throw new Error('Не удалось захватить график');
    }
  }

  /**
   * Создание таблицы результатов для вставки в документ
   */
  private createResultsTable(results: AnalysisResult[]): any {
    const headers = [
      '№ зоны измерения',
      'Уровень измерения (м.)',
      'Наименование логгера',
      'Серийный № логгера',
      'Мин. t°C',
      'Макс. t°C',
      'Среднее t°C',
      'Соответствие лимитам'
    ];

    const rows = results.map(result => [
      result.zoneNumber === 999 ? 'Внешний' : result.zoneNumber.toString(),
      result.measurementLevel.toString(),
      result.loggerName,
      result.serialNumber,
      result.minTemp.toString(),
      result.maxTemp.toString(),
      result.avgTemp.toString(),
      result.meetsLimits
    ]);

    return {
      headers,
      rows,
    };
  }

  /**
   * Форматирование данных отчета для замены плейсхолдеров
   */
  private formatReportData(data: ReportData): Record<string, string> {
    return {
      'Report No.': data.reportNo,
      'Report date': data.reportDate,
      'name of the object': data.nameOfObject,
      'name of the air conditioning system': data.nameOfAirConditioningSystem,
      'name of the test': data.nameOfTest,
      'Date time of test start': data.dateTimeOfTestStart,
      'Date time of test completion': data.dateTimeOfTestCompletion,
      'Duration of the test': data.durationOfTest,
      'acceptance criteria': data.acceptanceCriteria,
      'Result': data.result,
      'executor': data.executor,
      'director': data.director,
      'test date': data.testDate,
    };
  }
}