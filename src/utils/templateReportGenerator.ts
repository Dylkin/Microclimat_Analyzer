import JSZip from 'jszip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import PizZip from 'pizzip';

export interface TemplateReportData {
  chartImageBlob: Blob;
  analysisResults: any[];
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
      const htmlTable = this.createFormattedHtmlTable(data.analysisResults);
      console.log('HTML таблица создана, длина:', htmlTable.length);

      // Создаем экземпляр Docxtemplater с модулем изображений
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });
      console.log('Docxtemplater создан с ImageModule');

      // Создаем таблицу результатов в текстовом формате
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
        ResultsTable: htmlTable || ''
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

  private createFormattedHtmlTable(analysisResults: any[]): string {
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

    let html = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">№ зоны измерения</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Уровень измерения (м.)</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Наименование логгера</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Серийный № логгера</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Мин. t°C</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Макс. t°C</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Среднее t°C</th>
            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Соответствие лимитам</th>
          </tr>
        </thead>
        <tbody>
    `;

    analysisResults.forEach((result, index) => {
      // Определяем цвет фона для минимальных и максимальных значений
      let minTempStyle = 'border: 1px solid #dee2e6; padding: 8px;';
      let maxTempStyle = 'border: 1px solid #dee2e6; padding: 8px;';
      
      if (!result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
          globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp) {
        minTempStyle += ' background-color: #cce5ff;'; // Голубой фон для минимума
      }
      
      if (!result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
          globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp) {
        maxTempStyle += ' background-color: #ffcccc;'; // Розовый фон для максимума
      }

      // Определяем цвет для соответствия лимитам
      let complianceStyle = 'border: 1px solid #dee2e6; padding: 8px;';
      let complianceColor = '';
      if (result.meetsLimits === 'Да') {
        complianceColor = 'color: #28a745; font-weight: bold;';
      } else if (result.meetsLimits === 'Нет') {
        complianceColor = 'color: #dc3545; font-weight: bold;';
      }

      html += `
        <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
          <td style="border: 1px solid #dee2e6; padding: 8px;">${result.zoneNumber}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px;">${result.measurementLevel}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px;">${result.loggerName}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px;">${result.serialNumber}</td>
          <td style="${minTempStyle}">${result.minTemp}</td>
          <td style="${maxTempStyle}">${result.maxTemp}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px;">${result.avgTemp}</td>
          <td style="${complianceStyle} ${complianceColor}">${result.meetsLimits}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-family: Arial, sans-serif;">
        <h4 style="margin-top: 0; color: #495057;">Обозначения:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center;">
            <div style="width: 20px; height: 15px; background-color: #cce5ff; margin-right: 8px; border: 1px solid #999;"></div>
            <span style="font-size: 14px;">Минимальное значение в выбранном периоде</span>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 20px; height: 15px; background-color: #ffcccc; margin-right: 8px; border: 1px solid #999;"></div>
            <span style="font-size: 14px;">Максимальное значение в выбранном периоде</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="color: #28a745; font-weight: bold; margin-right: 8px;">Да</span>
            <span style="font-size: 14px;">Соответствует лимитам</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="color: #dc3545; font-weight: bold; margin-right: 8px;">Нет</span>
            <span style="font-size: 14px;">Не соответствует лимитам</span>
          </div>
        </div>
        <div style="margin-top: 15px; font-size: 12px; color: #6c757d;">
          <strong>Примечание:</strong> При изменении масштаба графика статистика пересчитывается только для выбранного временного периода.
        </div>
      </div>
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