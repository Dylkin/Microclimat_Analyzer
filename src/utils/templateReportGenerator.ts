import JSZip from 'jszip';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module-free';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
  executor: string;
  reportDate: string;
  dataType: 'temperature' | 'humidity';
}

export class TemplateReportGenerator {
  private static instance: TemplateReportGenerator;

  static getInstance(): TemplateReportGenerator {
    if (!TemplateReportGenerator.instance) {
      TemplateReportGenerator.instance = new TemplateReportGenerator();
    }
    return TemplateReportGenerator.instance;
  }

  async generateReportFromTemplate(templateFile: File, data: TemplateReportData): Promise<Blob> {
    try {
      console.log('Начинаем обработку DOCX шаблона с Docxtemplater...');
      
      // Читаем шаблон как ArrayBuffer
      const templateArrayBuffer = await templateFile.arrayBuffer();
      
      // Конвертируем изображение в ArrayBuffer
      const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
      
      // Создаем ZIP из шаблона
      const zip = new PizZip(templateArrayBuffer);
      
      // Настраиваем модуль для изображений
      const imageOpts = {
        centered: true,
        fileType: 'docx',
        getImage: (tagValue: string, tagName: string) => {
          console.log(`Обработка изображения для тега: ${tagName}`);
          if (tagName === 'chart') {
            return chartImageBuffer;
          }
          throw new Error(`Неизвестный тег изображения: ${tagName}`);
        },
        getSize: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log(`Установка размера изображения для тега: ${tagName}`);
          if (tagName === 'chart') {
            // Размеры в пикселях для DOCX (конвертируются в EMU автоматически)
            return [800, 600]; // ширина x высота
          }
          throw new Error(`Неизвестный тег изображения для размера: ${tagName}`);
        },
        getProps: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log(`Установка свойств изображения для тега: ${tagName}`);
          return {
            // Дополнительные свойства для корректной вставки
            extension: '.png',
            mime: 'image/png'
          };
        }
      };

      const imageModule = new ImageModule(imageOpts);

      // Создаем экземпляр Docxtemplater
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      }
      )
      // Создаем таблицу результатов в формате HTML/текст
      const resultsTable = this.createResultsTable(data.analysisResults);

      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        report_date: data.reportDate,
        // НЕ добавляем chart в templateData - только через imageModule
        results_table: resultsTable
      };

      console.log('Данные для шаблона:', {
        executor: data.executor,
        report_date: data.reportDate,
        chart_image_size: `${chartImageBuffer.byteLength} байт`
      });

      // Заполняем шаблон данными
      doc.setData(templateData);

      try {
        // Рендерим документ
        doc.render();
        console.log('Документ успешно отрендерен');
      } catch (error) {
        console.error('Ошибка рендеринга документа:', error);
        
        // Выводим подробную информацию об ошибке
        if (error.properties && error.properties.errors instanceof Array) {
          const errorMessages = error.properties.errors.map((err: any) => {
            return `${err.name}: ${err.message} в части "${err.part}"`;
          }).join('\n');
          console.error('Детали ошибок:', errorMessages);
        }
        
        throw error;
      }

      // Генерируем новый DOCX файл
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      console.log('DOCX файл успешно сгенерирован');
      return output;

    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw new Error(`Не удалось создать отчет из шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  private createResultsTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return 'Нет данных для отображения';
    }

    let table = 'РЕЗУЛЬТАТЫ АНАЛИЗА:\n\n';
    
    // Заголовок таблицы
    table += '№ зоны | Уровень (м.) | Логгер | S/N | Мин. t°C | Макс. t°C | Среднее t°C | Соответствие\n';
    table += '-------|-------------|--------|-----|----------|-----------|-------------|-------------\n';
    
    // Строки данных
    analysisResults.forEach(result => {
      const zoneNumber = result.zoneNumber === 999 ? 'Внешний' : (result.zoneNumber || '-');
      table += `${zoneNumber} | ${result.measurementLevel || '-'} | ${result.loggerName || '-'} | ${result.serialNumber || '-'} | ${result.minTemp || '-'} | ${result.maxTemp || '-'} | ${result.avgTemp || '-'} | ${result.meetsLimits || '-'}\n`;
    });

    table += '\n';
    
    // Добавляем статистику
    const validResults = analysisResults.filter(r => !r.isExternal && r.minTemp !== '-');
    const externalSensors = analysisResults.filter(r => r.isExternal).length;
    
    table += `\nОбщая статистика:\n`;
    table += `- Всего датчиков: ${analysisResults.length}\n`;
    table += `- Внутренние датчики: ${validResults.length}\n`;
    table += `- Внешние датчики: ${externalSensors}\n`;
    
    const compliantCount = analysisResults.filter(r => r.meetsLimits === 'Да').length;
    const nonCompliantCount = analysisResults.filter(r => r.meetsLimits === 'Нет').length;
    
    if (compliantCount > 0 || nonCompliantCount > 0) {
      table += `- Соответствуют лимитам: ${compliantCount}\n`;
      table += `- Не соответствуют лимитам: ${nonCompliantCount}\n`;
    }

    return table;
  }

  async saveReport(blob: Blob, filename: string): Promise<void> {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Очищаем URL через некоторое время
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
}