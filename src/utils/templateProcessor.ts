import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export interface TemplateData {
  date: string;
  data_type: string;
  chart_image: string;
  table: string;
  title: string;
  analysis_summary: string;
  file_count: number;
  temperature_range: string;
  humidity_range: string;
  time_period: string;
}

export class TemplateProcessor {
  /**
   * Обработка DOCX шаблона с заменой плейсхолдеров
   */
  async processTemplate(templateFile: File, templateData: TemplateData): Promise<Blob> {
    try {
      console.log('Начинаем обработку шаблона:', templateFile.name);
      console.log('Данные для шаблона:', Object.keys(templateData));

      // 1. Загружаем шаблон
      const templateBuffer = await templateFile.arrayBuffer();
      const content = new Uint8Array(templateBuffer);
      const zip = new PizZip(content);

      // 2. Инициализируем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });

      // 3. Заменяем плейсхолдеры данными
      doc.render(templateData);

      // 4. Генерируем итоговый файл
      const reportBlob = doc.getZip().generate({ 
        type: "blob",
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      console.log('Шаблон успешно обработан');
      return reportBlob;

    } catch (error) {
      console.error('Ошибка обработки шаблона:', error);
      throw new Error(`Не удалось обработать шаблон: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Конвертация Blob в base64 по частям для избежания переполнения стека
   */
  async convertBlobToBase64(blob: Blob): Promise<string> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let base64String = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64String += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
      }
      
      return base64String;
    } catch (error) {
      console.error('Ошибка конвертации в base64:', error);
      throw new Error('Не удалось конвертировать изображение в base64');
    }
  }

  /**
   * Создание HTML таблицы результатов анализа
   */
  createAnalysisTable(analysisResults: any[]): string {
    if (!analysisResults || analysisResults.length === 0) {
      return 'Нет данных для отображения';
    }

    let tableHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">№ зоны</th>
            <th style="padding: 8px; text-align: left;">Уровень (м.)</th>
            <th style="padding: 8px; text-align: left;">Логгер</th>
            <th style="padding: 8px; text-align: left;">S/N</th>
            <th style="padding: 8px; text-align: left;">Мин. t°C</th>
            <th style="padding: 8px; text-align: left;">Макс. t°C</th>
            <th style="padding: 8px; text-align: left;">Среднее t°C</th>
            <th style="padding: 8px; text-align: left;">Соответствие</th>
          </tr>
        </thead>
        <tbody>
    `;

    analysisResults.forEach((result, index) => {
      const rowStyle = index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f9f9f9;';
      tableHtml += `
        <tr style="${rowStyle}">
          <td style="padding: 6px;">${result.zoneNumber}</td>
          <td style="padding: 6px;">${result.measurementLevel}</td>
          <td style="padding: 6px;">${result.loggerName}</td>
          <td style="padding: 6px;">${result.serialNumber}</td>
          <td style="padding: 6px;">${result.minTemp}</td>
          <td style="padding: 6px;">${result.maxTemp}</td>
          <td style="padding: 6px;">${result.avgTemp}</td>
          <td style="padding: 6px;">${result.meetsLimits}</td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    return tableHtml;
  }
}