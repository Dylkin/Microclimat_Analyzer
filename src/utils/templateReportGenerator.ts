import JSZip from 'jszip';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module-free';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
  executor: string;
  reportDate: string;
  reportNumber: string;
  reportStart: string;
  dataType: 'temperature' | 'humidity';
  resultsTable: string;
  acceptanceCriteria: string;
  testType: string;
  objectName: string;
  coolingSystemName: string;
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
      console.log('=== Начало генерации отчета из шаблона ===');
      console.log('Имя файла шаблона:', templateFile.name);
      console.log('Размер файла шаблона:', templateFile.size, 'байт');
      
      // Читаем шаблон как ArrayBuffer
      const templateArrayBuffer = await templateFile.arrayBuffer();
      console.log('Шаблон успешно прочитан как ArrayBuffer');
      
      // Конвертируем изображение в ArrayBuffer
      const chartImageBuffer = await data.chartImageBlob.arrayBuffer();
      console.log('Изображение конвертировано в ArrayBuffer, размер:', chartImageBuffer.byteLength, 'байт');
      
      // Создаем ZIP из шаблона
      const zip = new PizZip(templateArrayBuffer);
      console.log('ZIP архив создан из шаблона');
      
      // Настраиваем модуль для изображений
      const imageOpts = {
        centered: false,
        fileType: 'docx',
        getImage: (tagValue: string, tagName: string) => {
          console.log(`Обработка изображения для тега: ${tagName}, значение: ${tagValue}`);
          if (tagName === 'chart') {
            console.log('Возвращаем ArrayBuffer изображения для тега chart');
            return chartImageBuffer;
          }
          console.error(`Неизвестный тег изображения: ${tagName}`);
          throw new Error(`Неизвестный тег изображения: ${tagName}`);
        },
        getSize: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log(`Установка размера изображения для тега: ${tagName}`);
          if (tagName === 'chart') {
            console.log('Устанавливаем размер изображения: 600x800 пикселей');
            return [600, 800];
          }
          console.log('Возвращаем null для размера (размер по умолчанию)');
          return [400, 300]; // Размер по умолчанию
        },
        getProps: (img: ArrayBuffer, tagValue: string, tagName: string) => {
          console.log(`Установка свойств изображения для тега: ${tagName}`);
          if (tagName === 'chart') {
            return {
              extension: 'png',
              mime: 'image/png'
            };
          }
          return null;
        }
      };

      console.log('Настройки ImageModule подготовлены');
      const imageModule = new ImageModule(imageOpts);
      console.log('ImageModule создан');

      // Создаем экземпляр Docxtemplater с модулем изображений
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });
      console.log('Docxtemplater создан с ImageModule');

      // Создаем таблицу результатов в текстовом формате
      const resultsTable = this.createResultsTable(data.analysisResults);
      console.log('Таблица результатов создана, длина:', resultsTable.length);

      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        Report_No: data.reportNumber,
        Report_start: data.reportStart,
        report_date: data.reportDate, // Оставляем для обратной совместимости
        chart: 'chart_placeholder', // Значение для ImageModule
        Results_table: data.resultsTable,
        results_table: resultsTable, // Оставляем для обратной совместимости
        Acceptance_criteria: data.acceptanceCriteria,
        TestType: data.testType || 'Не выбрано',
        AcceptanceСriteria: data.acceptanceCriteria, // Русская С в AcceptanceСriteria
        ResultsTable: data.resultsTable,
        ObjectName: data.objectName,
        CoolingSystemName: data.coolingSystemName
      };

      console.log('=== Данные для шаблона ===');
      console.log('executor:', data.executor);
      console.log('Report_No:', data.reportNumber);
      console.log('Report_start:', data.reportStart);
      console.log('report_date:', data.reportDate);
      console.log('chart_image_size:', `${chartImageBuffer.byteLength} байт`);
      console.log('Results_table_length:', data.resultsTable?.length || 0);
      console.log('Acceptance_criteria_length:', data.acceptanceCriteria?.length || 0);
      console.log('TestType:', data.testType);
      console.log('AcceptanceСriteria_length:', data.acceptanceCriteria?.length || 0);
      console.log('ResultsTable_length:', data.resultsTable?.length || 0);
      console.log('ObjectName:', data.objectName);
      console.log('CoolingSystemName:', data.coolingSystemName);

      // Заполняем шаблон данными
      console.log('Устанавливаем данные в шаблон...');
      doc.setData(templateData);

      try {
        // Рендерим документ
        console.log('Начинаем рендеринг документа...');
        doc.render();
        console.log('Документ успешно отрендерен с ImageModule');
      } catch (error) {
        console.error('Ошибка рендеринга документа:', error);
        
        // Выводим подробную информацию об ошибке
        if (error && typeof error === 'object' && 'properties' in error) {
          const errorProps = (error as any).properties;
          if (errorProps && errorProps.errors instanceof Array) {
            const errorMessages = errorProps.errors.map((err: any) => {
              return `${err.name || 'Unknown'}: ${err.message || 'No message'} в части "${err.part || 'Unknown'}"`;
            }).join('\n');
            console.error('Детали ошибок рендеринга:', errorMessages);
          }
          if (errorProps && errorProps.id) {
            console.error('ID ошибки:', errorProps.id);
          }
          if (errorProps && errorProps.explanation) {
            console.error('Объяснение ошибки:', errorProps.explanation);
          }
        }
        
        // Проверяем, является ли это ошибкой отсутствующих тегов
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('tag')) {
          console.error('Возможно, в шаблоне отсутствуют необходимые теги или используются неправильные имена тегов');
          console.error('Ожидаемые теги: {executor}, {Report_No}, {Report_start}, {report_date}, {%chart}, {Results_table}, {Acceptance_criteria}');
        }
        
        throw new Error(`Ошибка рендеринга документа: ${errorMessage}`);
      }

      // Генерируем новый DOCX файл
      console.log('Генерируем DOCX файл...');
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      console.log('=== DOCX файл успешно сгенерирован ===');
      console.log('Размер итогового файла:', output.size, 'байт');
      return output;

    } catch (error) {
      console.error('=== КРИТИЧЕСКАЯ ОШИБКА ГЕНЕРАЦИИ ОТЧЕТА ===');
      console.error('Тип ошибки:', error?.constructor?.name || 'Unknown');
      console.error('Сообщение ошибки:', error instanceof Error ? error.message : String(error));
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Дополнительная диагностика
      if (error instanceof Error) {
        if (error.message.includes('PizZip')) {
          console.error('Проблема с ZIP архивом - возможно, поврежден файл шаблона');
        } else if (error.message.includes('ImageModule')) {
          console.error('Проблема с модулем изображений - проверьте формат PNG файла');
        } else if (error.message.includes('docxtemplater')) {
          console.error('Проблема с docxtemplater - проверьте синтаксис тегов в шаблоне');
        }
      }
      
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

  private createHtmlTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return '<p>Нет данных для отображения</p>';
    }

    let html = `
      <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px;">
        <thead>
          <tr style="background-color: #f0f0f0; font-weight: bold;">
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">№ зоны измерения</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Уровень измерения (м.)</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Наименование логгера (6 символов)</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Серийный № логгера</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Мин. t°C</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Макс. t°C</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Среднее t°C</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Соответствие лимитам</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Добавляем строки данных
    analysisResults.forEach(result => {
      const zoneNumber = result.zoneNumber === 999 ? 'Внешний' : (result.zoneNumber || '-');
      const complianceStyle = result.meetsLimits === 'Да' 
        ? 'background-color: #d4edda; color: #155724;' 
        : result.meetsLimits === 'Нет' 
        ? 'background-color: #f8d7da; color: #721c24;' 
        : '';
      
      html += `
        <tr>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${zoneNumber}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${result.measurementLevel || '-'}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${result.loggerName || '-'}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${result.serialNumber || '-'}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${result.minTemp || '-'}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${result.maxTemp || '-'}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${result.avgTemp || '-'}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center; ${complianceStyle}">${result.meetsLimits || '-'}</td>
        </tr>
       `;
     });

    html += `
        </tbody>
      </table>
    `;

    return html;
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