import { createReport } from 'docx-templates';
import { saveAs } from 'file-saver';
import { UploadedFile } from '../types/FileData';

export interface ReportData {
  // Основная информация
  'Report No.': string;
  'Report date': string;
  'name of the object': string;
  'name of the air conditioning system': string;
  'name of the test': string;
  
  // Временные данные
  'Date time of test start': string;
  'Date time of test completion': string;
  'Duration of the test': string;
  
  // Критерии и результаты
  'acceptance criteria': string;
  'Results table': any[];
  'Result': string;
  
  // Исполнители
  'executor': string;
  'director': string;
  'test date': string;
  
  // График
  'chart': Uint8Array;
}

export class ReportGenerator {
  /**
   * Генерация отчета на основе шаблона DOCX
   */
  async generateReport(
    templateFile: File,
    reportData: Partial<ReportData>,
    analysisResults: any[],
    chartImageData: string
  ): Promise<void> {
    try {
      console.log('Начинаем генерацию отчета...');
      
      // Читаем шаблон
      const templateBuffer = await this.readFileAsArrayBuffer(templateFile);
      
      // Подготавливаем данные для отчета
      const templateData = await this.prepareTemplateData(reportData, analysisResults, chartImageData);
      
      console.log('Данные для шаблона подготовлены:', Object.keys(templateData));
      
      // Генерируем отчет
      const reportBuffer = await createReport({
        template: templateBuffer,
        data: templateData,
        cmdDelimiter: ['{', '}'],
        processLineBreaks: true,
        failFast: false
      });
      
      // Сохраняем файл
      const fileName = `Отчет_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.docx`;
      const blob = new Blob([reportBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      saveAs(blob, fileName);
      console.log('Отчет успешно сгенерирован:', fileName);
      
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      throw new Error(`Не удалось сгенерировать отчет: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }
  
  /**
   * Подготовка данных для шаблона
   */
  private async prepareTemplateData(
    reportData: Partial<ReportData>,
    analysisResults: any[],
    chartImageData: string
  ): Promise<any> {
    // Базовые данные с значениями по умолчанию
    const templateData: any = {
      'Report No.': reportData['Report No.'] || 'Не указан',
      'Report date': reportData['Report date'] || new Date().toLocaleDateString('ru-RU'),
      'name of the object': reportData['name of the object'] || 'Не указан',
      'name of the air conditioning system': reportData['name of the air conditioning system'] || 'Не указана',
      'name of the test': reportData['name of the test'] || 'Мониторинг температуры и влажности',
      'Date time of test start': reportData['Date time of test start'] || 'Не указано',
      'Date time of test completion': reportData['Date time of test completion'] || 'Не указано',
      'Duration of the test': reportData['Duration of the test'] || 'Не указано',
      'acceptance criteria': reportData['acceptance criteria'] || 'Согласно техническому заданию',
      'Result': reportData['Result'] || 'Требования выполнены',
      'executor': reportData['executor'] || 'Не указан',
      'director': reportData['director'] || 'Не указан',
      'test date': reportData['test date'] || new Date().toLocaleDateString('ru-RU')
    };
    
    // Подготавливаем таблицу результатов
    templateData['Results table'] = this.prepareResultsTable(analysisResults);
    
    // Подготавливаем изображение графика (поворачиваем на 90° против часовой стрелки)
    if (chartImageData) {
      const rotatedImageData = await this.rotateImageCounterClockwise(chartImageData);
      templateData['chart'] = rotatedImageData;
    }
    
    return templateData;
  }
  
  /**
   * Подготовка таблицы результатов для вставки в документ
   */
  private prepareResultsTable(analysisResults: any[]): any[] {
    if (!analysisResults || analysisResults.length === 0) {
      return [{
        zoneNumber: 'Нет данных',
        measurementLevel: '-',
        loggerName: '-',
        serialNumber: '-',
        minTemp: '-',
        maxTemp: '-',
        avgTemp: '-',
        meetsLimits: '-'
      }];
    }
    
    return analysisResults.map(result => ({
      zoneNumber: result.zoneNumber || '-',
      measurementLevel: result.measurementLevel || '-',
      loggerName: result.loggerName || '-',
      serialNumber: result.serialNumber || '-',
      minTemp: result.minTemp || '-',
      maxTemp: result.maxTemp || '-',
      avgTemp: result.avgTemp || '-',
      meetsLimits: result.meetsLimits || '-'
    }));
  }
  
  /**
   * Поворот изображения на 90° против часовой стрелки
   */
  private async rotateImageCounterClockwise(imageDataUrl: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Создаем canvas с повернутыми размерами
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Не удалось создать контекст canvas'));
            return;
          }
          
          // Устанавливаем размеры canvas (меняем местами ширину и высоту)
          canvas.width = img.height;
          canvas.height = img.width;
          
          // Поворачиваем на 90° против часовой стрелки
          ctx.translate(0, img.width);
          ctx.rotate(-Math.PI / 2);
          
          // Рисуем изображение
          ctx.drawImage(img, 0, 0);
          
          // Конвертируем в Uint8Array
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Не удалось создать blob из canvas'));
              return;
            }
            
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              resolve(new Uint8Array(arrayBuffer));
            };
            reader.onerror = () => reject(new Error('Ошибка чтения blob'));
            reader.readAsArrayBuffer(blob);
          }, 'image/png');
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = imageDataUrl;
    });
  }
  
  /**
   * Чтение файла как ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Получение списка доступных плейсхолдеров
   */
  getAvailablePlaceholders(): string[] {
    return [
      // Основная информация
      '{Report No.}',
      '{Report date}',
      '{name of the object}',
      '{name of the air conditioning system}',
      '{name of the test}',
      
      // Временные данные
      '{Date time of test start}',
      '{Date time of test completion}',
      '{Duration of the test}',
      
      // Критерии и результаты
      '{acceptance criteria}',
      '{Results table}',
      '{Result}',
      
      // Исполнители
      '{executor}',
      '{director}',
      '{test date}',
      
      // График
      '{chart}'
    ];
  }
}