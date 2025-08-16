import React from 'react';
import html2canvas from 'html2canvas';
import { Buffer } from 'buffer';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module';
import TableModule from 'docxtemplater-table-module';

export interface TemplateData {
  date: string;
  data_type: string;
  title: string;
  analysis_summary: string;
  file_count: number;
  temperature_range: string;
  humidity_range: string;
  time_period: string;
  chart_image?: {
    data: Buffer;
    size: { width: number; height: number };
    rotation: number;
    extension: string;
  };
  table_data: {
    rows: Array<{
      zone: string;
      level: string;
      logger: string;
      sn: string;
      minTemp: string;
      maxTemp: string;
      avgTemp: string;
      minHumidity: string;
      maxHumidity: string;
      avgHumidity: string;
      meetsLimits: string;
    }>;
  };
}

export class TemplateProcessor {
  /**
   * Создание PNG изображения графика с поворотом на 90°
   */
  async createChartPNG(chartElement: HTMLElement): Promise<ArrayBuffer> {
    try {
      console.log('Создание PNG изображения графика...');

      // 1. Временно скрываем кнопки управления
      const buttons = chartElement.querySelectorAll('button');
      const originalDisplays: string[] = [];
      buttons.forEach((button, index) => {
        originalDisplays[index] = button.style.display;
        button.style.display = 'none';
      });

      try {
        // 2. Создаем скриншот с высоким качеством
        const canvas = await html2canvas(chartElement, {
          scale: 2, // Увеличиваем разрешение в 2 раза
          backgroundColor: '#ffffff', // Белый фон
          useCORS: true, // Поддержка CORS для внешних ресурсов
          allowTaint: true, // Разрешаем "загрязненные" canvas
          logging: false, // Отключаем логирование
          width: chartElement.offsetWidth,
          height: chartElement.offsetHeight,
          onclone: (clonedDoc) => {
            // Убеждаемся, что в клонированном документе тоже скрыты кнопки
            const clonedButtons = clonedDoc.querySelectorAll('button');
            clonedButtons.forEach(button => {
              button.style.display = 'none';
            });
          }
        });

        // 3. Создаем новый canvas для поворота изображения на 90° против часовой стрелки
        const rotatedCanvas = document.createElement('canvas');
        const ctx = rotatedCanvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Ошибка создания контекста для поворота изображения');
        }

        // 4. Устанавливаем размеры повернутого canvas (меняем местами ширину и высоту)
        rotatedCanvas.width = canvas.height;
        rotatedCanvas.height = canvas.width;

        // 5. Поворачиваем контекст на 90° против часовой стрелки
        ctx.translate(0, canvas.width);
        ctx.rotate(-Math.PI / 2);

        // 6. Рисуем исходное изображение на повернутом canvas
        ctx.drawImage(canvas, 0, 0);

        // 7. Конвертируем повернутый canvas в blob
        const chartBlob = await new Promise<Blob>((resolve, reject) => {
          rotatedCanvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Ошибка создания изображения графика'));
            }
          }, 'image/png', 1.0); // PNG формат, максимальное качество
        });

        // 8. Конвертируем в ArrayBuffer
        const imageBuffer = await chartBlob.arrayBuffer();
        console.log('PNG изображение создано успешно, размер:', imageBuffer.byteLength, 'байт');
        return imageBuffer;

      } finally {
        // 9. Восстанавливаем отображение кнопок
        buttons.forEach((button, index) => {
          button.style.display = originalDisplays[index] || '';
        });
      }

    } catch (error) {
      console.error('Ошибка создания PNG изображения:', error);
      throw new Error(`Не удалось создать изображение графика: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Обработка DOCX шаблона с заменой плейсхолдеров
   */
  async processTemplate(templateFile: File, templateData: TemplateData): Promise<Blob> {
    try {
      console.log('Начинаем обработку DOCX шаблона:', templateFile.name);
      console.log('Данные для шаблона:', Object.keys(templateData));

      // 1. Загружаем шаблон
      const templateBuffer = await templateFile.arrayBuffer();
      const content = new Uint8Array(templateBuffer);
      const zip = new PizZip(content);

      // 2. Настройки для модуля изображений
      const imageOpts = {
        centered: false,
        getImage: (tagValue: any) => {
          if (tagValue && tagValue.data) {
            return tagValue.data;
          }
          throw new Error('Изображение не найдено');
        },
        getSize: (img: any, tagValue: any) => {
          if (tagValue && tagValue.size) {
            return [tagValue.size.width, tagValue.size.height];
          }
          return [600, 400]; // Размер по умолчанию в пикселях
        }
      };

      // 3. Инициализируем docxtemplater с модулями
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
        modules: [
          new ImageModule(imageOpts),
          new TableModule()
        ]
      });

      // 4. Заменяем плейсхолдеры данными
      console.log('Заменяем плейсхолдеры...');
      doc.render(templateData);

      // 5. Генерируем итоговый файл
      const reportBlob = doc.getZip().generate({ 
        type: "blob",
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      console.log('DOCX шаблон успешно обработан');
      return reportBlob;

    } catch (error) {
      console.error('Ошибка обработки DOCX шаблона:', error);
      throw new Error(`Не удалось обработать шаблон: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Подготовка данных таблицы для шаблона
   */
  prepareTableData(analysisResults: any[]): { rows: any[] } {
    return {
      rows: analysisResults.map(result => ({
        zone: result.zoneNumber || '-',
        level: result.measurementLevel || '-',
        logger: result.loggerName || '-',
        sn: result.serialNumber || '-',
        minTemp: result.minTemp || '-',
        maxTemp: result.maxTemp || '-',
        avgTemp: result.avgTemp || '-',
        minHumidity: result.minHumidity || '-',
        maxHumidity: result.maxHumidity || '-',
        avgHumidity: result.avgHumidity || '-',
        meetsLimits: result.meetsLimits || '-'
      }))
    };
  }

  /**
   * Создание полных данных для шаблона
   */
  async createTemplateData(
    reportData: {
      title: string;
      date: string;
      dataType: 'temperature' | 'humidity';
      analysisResults: any[];
    },
    chartImageBuffer: ArrayBuffer
  ): Promise<TemplateData> {
    
    const templateData: TemplateData = {
      date: reportData.date,
      data_type: reportData.dataType === 'temperature' ? 'Температура' : 'Влажность',
      title: reportData.title,
      analysis_summary: this.createAnalysisSummary(reportData.analysisResults, reportData.dataType),
      file_count: reportData.analysisResults.length,
      temperature_range: this.getTemperatureRange(reportData.analysisResults),
      humidity_range: this.getHumidityRange(reportData.analysisResults),
      time_period: 'Период анализа определяется загруженными данными',
      
      // Изображение графика для плейсхолдера {%image chart_image}
      chart_image: {
        data: Buffer.from(chartImageBuffer),
        size: { width: 600, height: 400 }, // размер в пикселях
        rotation: 0, // поворот уже применен при создании PNG
        extension: '.png'
      },
      
      // Данные таблицы для плейсхолдера {#table_data.rows}
      table_data: this.prepareTableData(reportData.analysisResults)
    };

    return templateData;
  }

  /**
   * Создание краткой сводки анализа
   */
  private createAnalysisSummary(results: any[], dataType: 'temperature' | 'humidity'): string {
    const validResults = results.filter(r => !r.isExternal && r.minTemp !== '-');
    const totalFiles = validResults.length;
    const externalSensors = results.filter(r => r.isExternal).length;
    const compliantCount = results.filter(r => r.meetsLimits === 'Да').length;
    const nonCompliantCount = results.filter(r => r.meetsLimits === 'Нет').length;

    let summary = `Общее количество датчиков: ${results.length}\n`;
    summary += `Внутренние датчики: ${totalFiles}\n`;
    summary += `Внешние датчики: ${externalSensors}\n\n`;
    
    if (dataType === 'temperature' && validResults.length > 0) {
      const temperatures = validResults.map(r => parseFloat(r.avgTemp)).filter(t => !isNaN(t));
      if (temperatures.length > 0) {
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        
        summary += `Температурная статистика:\n`;
        summary += `• Минимальная средняя температура: ${minTemp.toFixed(1)}°C\n`;
        summary += `• Максимальная средняя температура: ${maxTemp.toFixed(1)}°C\n`;
        summary += `• Общая средняя температура: ${avgTemp.toFixed(1)}°C\n\n`;
      }
    }
    
    if (compliantCount > 0 || nonCompliantCount > 0) {
      summary += `Соответствие лимитам:\n`;
      summary += `• Соответствуют: ${compliantCount} датчиков\n`;
      summary += `• Не соответствуют: ${nonCompliantCount} датчиков`;
    }
    
    return summary;
  }

  /**
   * Получение диапазона температур
   */
  private getTemperatureRange(results: any[]): string {
    const validResults = results.filter(r => !r.isExternal && r.minTemp !== '-');
    if (validResults.length === 0) return 'Нет данных';
    
    const temperatures = validResults.map(r => parseFloat(r.avgTemp)).filter(t => !isNaN(t));
    if (temperatures.length === 0) return 'Нет данных';
    
    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    return `${min.toFixed(1)}°C - ${max.toFixed(1)}°C`;
  }

  /**
   * Получение диапазона влажности
   */
  private getHumidityRange(results: any[]): string {
    const validResults = results.filter(r => !r.isExternal && r.minHumidity !== '-');
    if (validResults.length === 0) return 'Нет данных';
    
    const humidities = validResults.map(r => parseFloat(r.avgHumidity)).filter(h => !isNaN(h));
    if (humidities.length === 0) return 'Нет данных';
    
    const min = Math.min(...humidities);
    const max = Math.max(...humidities);
    return `${min.toFixed(1)}% - ${max.toFixed(1)}%`;
  }
}