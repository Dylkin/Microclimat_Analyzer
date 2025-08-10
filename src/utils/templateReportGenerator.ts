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
  resultsTableRows: any[];
  resultsTableXml?: string;
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
      const tableRows = this.createTableRowsData(data.analysisResults);
      console.log('Данные таблицы созданы, строк:', tableRows.length);
      
      // Создаем XML таблицу для вставки в DOCX
      const tableXml = this.createDocxTable(data.analysisResults);
      console.log('XML таблица создана');

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
        resultsTable: tableRows,
        resultsTableXml: tableXml,
        ResultsTable: tableXml // Добавляем для совместимости с разными названиями плейсхолдеров
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

  private createTableRowsData(analysisResults: any[]): any[] {
    if (!analysisResults || analysisResults.length === 0) {
      return [];
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

    // Создаем массив строк для таблицы
    const tableRows = analysisResults.map((result, index) => {
      const isMinTemp = !result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
                       globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp;
      const isMaxTemp = !result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
                       globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp;
      
      return {
        zoneNumber: result.zoneNumber,
        measurementLevel: result.measurementLevel,
        loggerName: result.loggerName,
        serialNumber: result.serialNumber,
        minTemp: result.minTemp,
        maxTemp: result.maxTemp,
        avgTemp: result.avgTemp,
        meetsLimits: result.meetsLimits,
        isMinTemp,
        isMaxTemp,
        isCompliant: result.meetsLimits === 'Да',
        isNonCompliant: result.meetsLimits === 'Нет'
      };
    });

    return tableRows;
  }

  private createDocxTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
        return `
        <w:p>
            <w:r>
                <w:t>Нет данных для отображения</w:t>
            </w:r>
        </w:p>`;
    }

    // Вычисляем глобальные минимальные и максимальные значения
    const minTempValues = analysisResults
        .filter(result => !result.isExternal)
        .map(result => parseFloat(result.minTemp))
        .filter(val => !isNaN(val));
    
    const maxTempValues = analysisResults
        .filter(result => !result.isExternal)
        .map(result => parseFloat(result.maxTemp))
        .filter(val => !isNaN(val));

    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;

    // Начало таблицы
    let tableXml = `
    <w:tbl>
        <w:tblPr>
            <w:tblStyle w:val="TableGrid"/>
            <w:tblW w:w="10000" w:type="pct"/>
            <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
        </w:tblPr>
        <w:tblGrid>
            <w:gridCol w:w="1200"/>
            <w:gridCol w:w="1200"/>
            <w:gridCol w:w="1200"/>
            <w:gridCol w:w="1200"/>
            <w:gridCol w:w="1000"/>
            <w:gridCol w:w="1000"/>
            <w:gridCol w:w="1000"/>
            <w:gridCol w:w="1400"/>
        </w:tblGrid>
        
        <!-- Заголовок таблицы -->
        <w:tr>
            <w:trPr>
                <w:tblHeader/>
            </w:trPr>
            ${this.createHeaderCell('№ зоны измерения')}
            ${this.createHeaderCell('Уровень измерения')}
            ${this.createHeaderCell('Логгер')}
            ${this.createHeaderCell('Серийный номер')}
            ${this.createHeaderCell('Мин. темп.')}
            ${this.createHeaderCell('Макс. темп.')}
            ${this.createHeaderCell('Ср. темп.')}
            ${this.createHeaderCell('Соответствие')}
        </w:tr>`;

    // Добавляем строки данных
    analysisResults.forEach((result, index) => {
        const isMinTemp = !result.isExternal && globalMinTemp !== null && 
                         parseFloat(result.minTemp) === globalMinTemp;
        const isMaxTemp = !result.isExternal && globalMaxTemp !== null && 
                         parseFloat(result.maxTemp) === globalMaxTemp;

        const rowBgColor = index % 2 === 0 ? 'F8F9FA' : 'FFFFFF';

        tableXml += `
        <w:tr>
            ${this.createDataCell(result.zoneNumber || '-', rowBgColor)}
            ${this.createDataCell(result.measurementLevel || '-', rowBgColor)}
            ${this.createDataCell(result.loggerName || '-', rowBgColor)}
            ${this.createDataCell(result.serialNumber || '-', rowBgColor)}
            ${this.createTempCell(result.minTemp, isMinTemp, rowBgColor)}
            ${this.createTempCell(result.maxTemp, isMaxTemp, rowBgColor)}
            ${this.createDataCell(result.avgTemp || '-', rowBgColor)}
            ${this.createDataCell(result.meetsLimits || '-', rowBgColor)}
        </w:tr>`;
    });

    // Закрываем таблицу
    tableXml += `
    </w:tbl>`;

    return tableXml;
  }

  private createHeaderCell(content: string): string {
    return `
    <w:tc>
        <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
            <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
        </w:tcPr>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>${content}</w:t>
            </w:r>
        </w:p>
    </w:tc>`;
  }

  private createDataCell(content: string, bgColor: string): string {
    return `
    <w:tc>
        <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
            <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
        </w:tcPr>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:t>${content}</w:t>
            </w:r>
        </w:p>
    </w:tc>`;
  }

  private createTempCell(tempValue: string, isHighlight: boolean, bgColor: string): string {
    const cellColor = isHighlight ? 'FF0000' : bgColor;
    const value = tempValue || '-';
    
    return `
    <w:tc>
        <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="${cellColor}"/>
            <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
        </w:tcPr>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:t>${value}</w:t>
            </w:r>
        </w:p>
    </w:tc>`;
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