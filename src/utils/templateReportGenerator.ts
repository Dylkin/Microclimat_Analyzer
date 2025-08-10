import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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
      
      // Создаем XML таблицу
      const tableXml = this.createTableXml(data.analysisResults);
      console.log('XML таблица создана, длина:', tableXml.length);
      
      // Подготавливаем данные для замены
      const templateData = {
        executor: data.executor,
        Report_No: data.reportNumber,
        Report_start: data.reportStart,
        report_date: data.reportDate,
        chart: chartImageBuffer,
        Acceptance_criteria: data.acceptanceCriteria,
        TestType: data.testType || 'Не выбрано',
        AcceptanceСriteria: data.acceptanceCriteria, // Русская С в AcceptanceСriteria
        ObjectName: data.objectName,
        CoolingSystemName: data.coolingSystemName,
        myTable: tableXml, // XML таблица
      };

      console.log('=== Данные для шаблона ===');
      console.log('executor:', data.executor);
      console.log('Report_No:', data.reportNumber);
      console.log('Report_start:', data.reportStart);
      console.log('report_date:', data.reportDate);
      console.log('chart_image_size:', `${chartImageBuffer.byteLength} байт`);
      console.log('TestType:', data.testType);
      console.log('ObjectName:', data.objectName);
      console.log('CoolingSystemName:', data.coolingSystemName);
      console.log('tableXml_length:', tableXml.length);

      // Загружаем шаблон в PizZip
      const zip = new PizZip(templateArrayBuffer);

      // Создаем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Устанавливаем данные
      doc.setData(templateData);

      try {
        // Рендерим документ
        doc.render();
      } catch (error) {
        console.error('Ошибка рендеринга документа:', error);
        throw new Error(`Ошибка заполнения шаблона: ${error}`);
      }

      // Генерируем итоговый документ
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      console.log('Отчет успешно сгенерирован');
      return output;
      
    } catch (error) {
      console.error('Ошибка генерации отчета из шаблона:', error);
      throw error;
    }
  }

  /**
   * Создание XML таблицы для вставки в DOCX
   */
  private createTableXml(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return '<w:p><w:r><w:t>Нет данных для отображения</w:t></w:r></w:p>';
    }

    // Вычисляем глобальные минимальные и максимальные значения
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    const globalMinTemp = minTempValues.length > 0 ? Math.min(...minTempValues) : null;
    const globalMaxTemp = maxTempValues.length > 0 ? Math.max(...maxTempValues) : null;

    // Начало таблицы
    let tableXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
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
        ${this.createHeaderCell('Уровень измерения (м.)')}
        ${this.createHeaderCell('Наименование логгера')}
        ${this.createHeaderCell('Серийный № логгера')}
        ${this.createHeaderCell('Мин. t°C')}
        ${this.createHeaderCell('Макс. t°C')}
        ${this.createHeaderCell('Среднее t°C')}
        ${this.createHeaderCell('Соответствие лимитам')}
      </w:tr>`;

    // Добавляем строки данных
    analysisResults.forEach((result, index) => {
      const isMinTemp = !result.isExternal && globalMinTemp !== null && 
                       !isNaN(parseFloat(result.minTemp)) && parseFloat(result.minTemp) === globalMinTemp;
      const isMaxTemp = !result.isExternal && globalMaxTemp !== null && 
                       !isNaN(parseFloat(result.maxTemp)) && parseFloat(result.maxTemp) === globalMaxTemp;

      const rowBgColor = index % 2 === 0 ? 'F8F9FA' : 'FFFFFF';

      tableXml += `
      <w:tr>
        ${this.createDataCell(result.zoneNumber || '-', rowBgColor)}
        ${this.createDataCell(result.measurementLevel || '-', rowBgColor)}
        ${this.createDataCell(result.loggerName || '-', rowBgColor)}
        ${this.createDataCell(result.serialNumber || '-', rowBgColor)}
        ${this.createTempCell(result.minTemp || '-', isMinTemp ? 'CCE5FF' : rowBgColor)}
        ${this.createTempCell(result.maxTemp || '-', isMaxTemp ? 'FFCCDD' : rowBgColor)}
        ${this.createDataCell(result.avgTemp || '-', rowBgColor)}
        ${this.createComplianceCell(result.meetsLimits || '-', rowBgColor)}
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
          <w:t>${this.escapeXml(content)}</w:t>
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
          <w:t>${this.escapeXml(content)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;
  }

  private createTempCell(content: string, bgColor: string): string {
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
          <w:t>${this.escapeXml(content)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;
  }

  private createComplianceCell(content: string, bgColor: string): string {
    const textColor = content === 'Да' ? '28A745' : content === 'Нет' ? 'DC3545' : '000000';
    
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
          <w:rPr>
            <w:color w:val="${textColor}"/>
            <w:b/>
          </w:rPr>
          <w:t>${this.escapeXml(content)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;
  }

  private escapeXml(text: string): string {
    // Проверяем, что text является строкой
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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