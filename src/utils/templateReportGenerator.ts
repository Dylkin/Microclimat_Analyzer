import JSZip from 'jszip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import PizZip from 'pizzip';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
  resultsTableHtml: string;
  executor: string;
  reportDate: string;
  reportNumber: string;
  reportStart: string;
  dataType: 'temperature' | 'humidity';
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

      // Создаем HTML таблицу
      // Создаем экземпляр Docxtemplater с модулем изображений
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });
      console.log('Docxtemplater создан с ImageModule');

      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        Report_No: data.reportNumber,
        Report_start: data.reportStart,
        report_date: data.reportDate, // Оставляем для обратной совместимости
        chart: 'chart_placeholder', // Значение для ImageModule
        Acceptance_criteria: data.acceptanceCriteria,
        TestType: data.testType || 'Не выбрано',
        AcceptanceСriteria: data.acceptanceCriteria, // Русская С в AcceptanceСriteria
        ObjectName: data.objectName,
        CoolingSystemName: data.coolingSystemName,
        myTable: data.resultsTableHtml,
      };

      console.log('=== Данные для шаблона ===');
      console.log('executor:', data.executor);
      console.log('Report_No:', data.reportNumber);
      console.log('Report_start:', data.reportStart);
      console.log('report_date:', data.reportDate);
      console.log('chart_image_size:', `${chartImageBuffer.byteLength} байт`);
      console.log('Acceptance_criteria_length:', data.acceptanceCriteria?.length || 0);
      console.log('TestType:', data.testType);
      console.log('AcceptanceСriteria_length:', data.acceptanceCriteria?.length || 0);
      console.log('ObjectName:', data.objectName);
      console.log('CoolingSystemName:', data.coolingSystemName);
      console.log('resultsTableHtml_length:', data.resultsTableHtml?.length || 0);

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
          }
        }
        
        throw error;
      }
      
      // Генерируем DOCX файл
      const buf = doc.getZip().generate({ type: 'arraybuffer' });
      return new Blob([buf], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw error;
    }
  }

  /**
   * Создание HTML таблицы с inline стилями для вставки в DOCX
   */
  static createHtmlTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return '<p>Нет данных для отображения</p>';
    }

    // Вычисляем глобальные минимальные и максимальные значения (исключая внешние датчики)
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;

    // Базовые стили для таблицы
    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      font-family: Arial, sans-serif;
      font-size: 12px;
    `;

    const headerCellStyle = `
      border: 1px solid #000000;
      background-color: #D9D9D9;
      padding: 8px;
      text-align: center;
      font-weight: bold;
    `;

    const dataCellStyle = `
      border: 1px solid #000000;
      padding: 8px;
      text-align: center;
    `;

    const evenRowStyle = `background-color: #F8F9FA;`;
    const oddRowStyle = `background-color: #FFFFFF;`;
    const minTempStyle = `background-color: #CCE5FF;`; // Голубой для минимума
    const maxTempStyle = `background-color: #FFCCDD;`; // Розовый для максимума
    const compliantStyle = `color: #28A745;`; // Зеленый для соответствия
    const nonCompliantStyle = `color: #DC3545;`; // Красный для несоответствия

    let html = `
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${headerCellStyle}">№ зоны измерения</th>
            <th style="${headerCellStyle}">Уровень измерения (м.)</th>
            <th style="${headerCellStyle}">Наименование логгера</th>
            <th style="${headerCellStyle}">Серийный № логгера</th>
            <th style="${headerCellStyle}">Мин. t°C</th>
            <th style="${headerCellStyle}">Макс. t°C</th>
            <th style="${headerCellStyle}">Среднее t°C</th>
            <th style="${headerCellStyle}">Соответствие лимитам</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Добавляем строки данных
    analysisResults.forEach((result, index) => {
      const isMinTemp = !result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
                       globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp;
      const isMaxTemp = !result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
                       globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp;
      
      const rowBgStyle = index % 2 === 0 ? evenRowStyle : oddRowStyle;
      
      // Стили для ячеек температуры
      const minTempCellStyle = `${dataCellStyle} ${rowBgStyle} ${isMinTemp ? minTempStyle : ''}`;
      const maxTempCellStyle = `${dataCellStyle} ${rowBgStyle} ${isMaxTemp ? maxTempStyle : ''}`;
      const regularCellStyle = `${dataCellStyle} ${rowBgStyle}`;
      
      // Стиль для ячейки соответствия лимитам
      let complianceStyle = regularCellStyle;
      if (result.meetsLimits === 'Да') {
        complianceStyle += ` ${compliantStyle}`;
      } else if (result.meetsLimits === 'Нет') {
        complianceStyle += ` ${nonCompliantStyle}`;
      }

      html += `
        <tr>
          <td style="${regularCellStyle}">${result.zoneNumber || '-'}</td>
          <td style="${regularCellStyle}">${result.measurementLevel || '-'}</td>
          <td style="${regularCellStyle}">${result.loggerName || '-'}</td>
          <td style="${regularCellStyle}">${result.serialNumber || '-'}</td>
          <td style="${minTempCellStyle}">${result.minTemp || '-'}</td>
          <td style="${maxTempCellStyle}">${result.maxTemp || '-'}</td>
          <td style="${regularCellStyle}">${result.avgTemp || '-'}</td>
          <td style="${complianceStyle}"><strong>${result.meetsLimits || '-'}</strong></td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    return html;
  }
    `;
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