import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export interface TemplateData {
  DATE: string;
  DATA_TYPE: string;
  CHART: ArrayBuffer;
  TABLE: any[];
}

/**
 * Процессор шаблонов DOCX для браузерной среды
 * Использует docxtemplater для замены плейсхолдеров
 */
export class TemplateProcessor {
  
  /**
   * Обработка шаблона DOCX с заменой плейсхолдеров
   */
  static async processTemplate(templateBuffer: ArrayBuffer, data: TemplateData): Promise<ArrayBuffer> {
    try {
      console.log('Начинаем обработку шаблона...');
      console.log('Размер шаблона:', templateBuffer.byteLength, 'байт');
      
      // Создаем ZIP из шаблона
      const zip = new PizZip(templateBuffer);
      
      // Создаем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Подготавливаем данные для замены
      const templateData = {
        DATE: data.DATE,
        DATA_TYPE: data.DATA_TYPE,
        // Для таблицы создаем текстовое представление
        TABLE: this.formatTableForTemplate(data.TABLE),
        // Для графика пока используем заглушку
        CHART: '[ГРАФИК БУДЕТ ВСТАВЛЕН]'
      };

      console.log('Данные для шаблона подготовлены:', templateData);

      // Заменяем плейсхолдеры
      doc.render(templateData);

      // Генерируем новый DOCX
      const output = doc.getZip().generate({
        type: 'arraybuffer',
        compression: 'DEFLATE',
      });

      console.log('Шаблон обработан успешно, размер результата:', output.byteLength, 'байт');
      
      return output;
      
    } catch (error) {
      console.error('Ошибка обработки шаблона:', error);
      throw new Error(`Не удалось обработать шаблон: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Форматирование таблицы для вставки в шаблон
   */
  private static formatTableForTemplate(results: any[]): string {
    if (!results || results.length === 0) {
      return 'Нет данных для отображения';
    }

    let tableText = 'РЕЗУЛЬТАТЫ АНАЛИЗА\n\n';
    tableText += '№ зоны | Уровень (м.) | Логгер | S/N | Мин. t°C | Макс. t°C | Среднее t°C | Соответствие\n';
    tableText += '-------|-------------|--------|-----|----------|-----------|-------------|-------------\n';

    results.forEach(result => {
      tableText += `${result.zoneNumber} | ${result.measurementLevel} | ${result.loggerName} | ${result.serialNumber} | ${result.minTemp} | ${result.maxTemp} | ${result.avgTemp} | ${result.meetsLimits}\n`;
    });

    return tableText;
  }
}